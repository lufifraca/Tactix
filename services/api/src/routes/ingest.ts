import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { safeEnqueueIngest, type IngestJob } from "../queue";
import { ingestUserAll, ingestGameAccount } from "../services/ingest/ingestOrchestrator";
import { extractErrorMessage } from "../utils/http";
import { prisma } from "../prisma";

export async function ingestRoutes(app: FastifyInstance) {
  app.post("/refresh", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    // Manual refresh is synchronous in v1 for responsiveness, and also enqueued for retry resilience.
    const result = await ingestUserAll(user.id);
    const job: IngestJob = { type: "INGEST_USER_ALL", userId: user.id };
    await safeEnqueueIngest("ingest", job, { removeOnComplete: true, removeOnFail: true });
    return { ok: true, result };
  });

  app.post("/refresh/account", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const Body = z.object({ gameAccountId: z.string() });
    const body = Body.parse((req as any).body);
    const account = await prisma.gameAccount.findFirst({ where: { id: body.gameAccountId, userId: user.id } });
    if (!account) return { ok: false };
    const result = await ingestGameAccount(account.id);
    await safeEnqueueIngest("ingest", { type: "INGEST_ACCOUNT", gameAccountId: account.id }, { removeOnComplete: true, removeOnFail: true });
    return { ok: true, result };
  });

  /**
   * GET /ingest/diagnostics
   * Tests each game API with the user's linked accounts and returns
   * detailed success/failure info for debugging.
   */
  app.get("/diagnostics", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const accounts = await prisma.gameAccount.findMany({ where: { userId: user.id } });

    const env = (await import("../env")).env;
    const checks: any[] = [];

    // Check env keys
    checks.push({
      type: "env",
      STEAM_WEB_API_KEY: !!env.STEAM_WEB_API_KEY,
      MARVEL_RIVALS_API_KEY: !!env.MARVEL_RIVALS_API_KEY,
      HENRIK_API_KEY: !!env.HENRIK_API_KEY,
      TRN_API_KEY: !!env.TRN_API_KEY,
      S3_CONFIGURED: !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY),
      S3_ENDPOINT: env.S3_ENDPOINT ? env.S3_ENDPOINT.replace(/\/\/.*@/, "//***@") : "(not set)",
    });

    for (const a of accounts) {
      const diag: any = { game: a.game, provider: a.provider, externalId: a.externalId, displayName: a.displayName };

      try {
        if (a.game === "CS2") {
          const { fetchCs2CumulativeStats } = await import("../services/ingest/cs2/steamStats");
          const data = await fetchCs2CumulativeStats(a.externalId);
          const statsCount = data?.playerstats?.stats?.length ?? 0;
          diag.status = "ok";
          diag.detail = `Steam returned ${statsCount} stats for game ${data?.playerstats?.gameName ?? "?"}`;
        } else if (a.game === "MARVEL_RIVALS") {
          const [, username] = a.externalId.includes(":") ? a.externalId.split(":", 2) : [null, a.externalId];
          const { fetchMarvelMatchHistoryCommunity } = await import("../services/ingest/marvelRivals/community");
          const mh = await fetchMarvelMatchHistoryCommunity({ query: username, page: 1, limit: 5 });
          diag.status = "ok";
          diag.detail = `Community API returned ${mh.match_history?.length ?? 0} matches`;
        } else if (a.game === "VALORANT") {
          const { henrikGetAccount } = await import("../services/ingest/valorant/henrikApi");
          const parts = a.displayName?.split("#") ?? [];
          if (parts.length === 2) {
            const acct = await henrikGetAccount(parts[0], parts[1]);
            diag.status = "ok";
            diag.detail = `Henrik returned account: ${acct.name}#${acct.tag} (level ${acct.account_level})`;
          } else {
            diag.status = "skip";
            diag.detail = `Cannot parse name#tag from displayName: ${a.displayName}`;
          }
        } else {
          diag.status = "skip";
          diag.detail = "No diagnostic for this game";
        }
      } catch (e: any) {
        diag.status = "error";
        diag.detail = extractErrorMessage(e).slice(0, 500);
      }

      checks.push(diag);
    }

    return { ok: true, diagnostics: checks };
  });

  /**
   * GET /ingest/diagnostics/full
   * Runs the actual ingest pipeline per-account and captures step-by-step results.
   * Safe to call multiple times (deduplicates matches).
   */
  app.get("/diagnostics/full", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const accounts = await prisma.gameAccount.findMany({ where: { userId: user.id } });
    const results: any[] = [];

    for (const a of accounts) {
      const entry: any = { game: a.game, provider: a.provider, externalId: a.externalId };
      try {
        const result = await ingestGameAccount(a.id);
        entry.status = "ok";
        entry.result = result;
      } catch (e: any) {
        entry.status = "error";
        entry.error = extractErrorMessage(e);
        entry.stack = e?.stack?.split("\n").slice(0, 5) ?? [];
      }
      results.push(entry);
    }

    return { ok: true, results };
  });

  app.get("/status", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const last = await prisma.match.findFirst({
      where: { userId: user.id },
      orderBy: { ingestedAt: "desc" },
      select: { ingestedAt: true },
    });
    return { lastIngestAt: last?.ingestedAt ?? null };
  });
}
