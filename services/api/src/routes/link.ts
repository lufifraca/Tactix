import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { encryptString } from "../utils/crypto";

export async function linkRoutes(app: FastifyInstance) {
  app.post("/cs2", async (req: AuthedRequest, reply) => {
    const user = await requireUser(req);
    const Body = z.object({
      steamGameAuthCode: z.string().min(6),
      knownMatchCode: z.string().min(10).optional(), // e.g., CSGO-XXXX-...
    });
    const body = Body.parse((req as any).body);

    // Find the user's CS2 Steam-linked account (created by Steam OpenID flow).
    const account = await prisma.gameAccount.findFirst({
      where: { userId: user.id, game: "CS2", provider: "STEAM" },
    });
    if (!account) {
      return reply.code(400).send({ error: "Link Steam first (CS2 requires Steam sign-in)." });
    }

    await prisma.gameAccount.update({
      where: { id: account.id },
      data: {
        steamGameAuthCode: encryptString(body.steamGameAuthCode),
        cs2KnownMatchCode: body.knownMatchCode ?? account.cs2KnownMatchCode,
      },
    });

    return { ok: true };
  });

  app.post("/marvel", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const Body = z.object({
      username: z.string().min(2),
      platform: z.string().optional().default("pc"),
      providerPreference: z.enum(["TRACKER_NETWORK", "COMMUNITY"]).optional().default("TRACKER_NETWORK"),
    });
    const body = Body.parse((req as any).body);

    // We store as COMMUNITY provider by default for v1, but keep preference in meta.
    const account = await prisma.gameAccount.upsert({
      where: {
        game_provider_externalId: {
          game: "MARVEL_RIVALS",
          provider: "COMMUNITY",
          externalId: `${body.platform}:${body.username}`,
        },
      },
      update: {
        userId: user.id,
        displayName: body.username,
        platform: body.platform,
        meta: { providerPreference: body.providerPreference },
      },
      create: {
        userId: user.id,
        game: "MARVEL_RIVALS",
        provider: "COMMUNITY",
        externalId: `${body.platform}:${body.username}`,
        displayName: body.username,
        platform: body.platform,
        meta: { providerPreference: body.providerPreference },
      },
    });

    return { ok: true, accountId: account.id };
  });

  app.post("/unlink", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const Body = z.object({ accountId: z.string() });
    const body = Body.parse((req as any).body);

    const account = await prisma.gameAccount.findUnique({ where: { id: body.accountId } });
    if (!account || account.userId !== user.id) {
      return { ok: false, error: "Account not found or not owned by you." };
    }

    await prisma.gameAccount.delete({ where: { id: body.accountId } });
    return { ok: true };
  });
  app.post("/supercell", async (req: AuthedRequest, reply) => {
    const user = await requireUser(req);
    const Body = z.object({
      tag: z.string().min(3),
      game: z.enum(["CLASH_ROYALE", "BRAWL_STARS"]),
    });
    const body = Body.parse((req as any).body);

    const { fetchClashRoyalePlayer, fetchBrawlStarsPlayer } = await import("../services/ingest/supercell");

    let profile: any = null;
    try {
      if (body.game === "CLASH_ROYALE") {
        profile = await fetchClashRoyalePlayer(body.tag);
      } else {
        profile = await fetchBrawlStarsPlayer(body.tag);
      }
    } catch (e: any) {
      req.log.warn({ err: e }, "Supercell tag validation failed");
      // Forward specific configuration errors or API errors
      const msg = e.message || "Unknown error";
      if (msg.includes("not configured") || msg.includes("403")) {
        return reply.code(400).send({ error: `Setup Error: ${msg}. Check API Token & IP.` });
      }
      return reply.code(400).send({ error: `Failed: ${msg}` });
    }

    if (!profile || !profile.name) {
      return reply.code(400).send({ error: "Player not found." });
    }

    const cleanTag = body.tag.toUpperCase().replace("#", "");

    // Upsert GameAccount
    const account = await prisma.gameAccount.upsert({
      where: {
        game_provider_externalId: {
          game: body.game,
          provider: "SUPERCELL",
          externalId: cleanTag,
        },
      },
      update: {
        userId: user.id,
        displayName: profile.name,
      },
      create: {
        userId: user.id,
        game: body.game,
        provider: "SUPERCELL",
        externalId: cleanTag,
        displayName: profile.name,
      },
    });

    return { ok: true, accountId: account.id, displayName: profile.name };
  });

  /**
   * POST /link/valorant
   * Link a Valorant account by Riot ID (GameName#TagLine)
   */
  app.post("/valorant", async (req: AuthedRequest, reply) => {
    const user = await requireUser(req);
    const Body = z.object({
      riotId: z.string().min(3), // Format: "GameName#TagLine"
      region: z.enum(["americas", "europe", "asia"]).optional().default("americas"),
    });
    const body = Body.parse((req as any).body);

    const { validateRiotId } = await import("../services/ingest/valorant");

    let account: any = null;
    try {
      account = await validateRiotId(body.riotId, body.region);
    } catch (e: any) {
      req.log.warn({ err: e }, "Riot ID validation failed");
      const msg = e.message || "Unknown error";
      if (msg.includes("not configured")) {
        return reply.code(400).send({ error: `Setup Error: ${msg}` });
      }
      if (msg.includes("404") || msg.includes("Data not found")) {
        return reply.code(400).send({ error: "Riot ID not found. Please check your Name#Tag and try again." });
      }
      return reply.code(400).send({ error: `Failed: ${msg}` });
    }

    if (!account || !account.puuid) {
      return reply.code(400).send({ error: "Player not found." });
    }

    // Format display name as "GameName#TagLine"
    const displayName = `${account.gameName}#${account.tagLine}`;

    // Upsert GameAccount
    const gameAccount = await prisma.gameAccount.upsert({
      where: {
        game_provider_externalId: {
          game: "VALORANT",
          provider: "RIOT",
          externalId: account.puuid,
        },
      },
      update: {
        userId: user.id,
        displayName,
        meta: {
          gameName: account.gameName,
          tagLine: account.tagLine,
          region: body.region,
        },
      },
      create: {
        userId: user.id,
        game: "VALORANT",
        provider: "RIOT",
        externalId: account.puuid,
        displayName,
        meta: {
          gameName: account.gameName,
          tagLine: account.tagLine,
          region: body.region,
        },
      },
    });

    return { ok: true, accountId: gameAccount.id, displayName };
  });
}
