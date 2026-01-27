import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { safeEnqueueIngest, type IngestJob } from "../queue";
import { ingestUserAll, ingestGameAccount } from "../services/ingest/ingestOrchestrator";
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
