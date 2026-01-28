import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { getLatestRank } from "../services/ingest/rankTracking";
import { listObjects, getObject, putObject } from "../services/storage";
import { fetchSteamLibrary } from "../services/ingest/steam/library";
import { redis } from "../queue";

export async function meRoutes(app: FastifyInstance) {
  app.get("/", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      subscriptionActive: subscription?.status === "ACTIVE",
    };
  });

  /**
   * PATCH /me/timezone
   * Update the user's timezone preference (IANA format like "America/New_York")
   * This is used for accurate time-of-day analytics (e.g., "best time to play")
   */
  app.patch("/timezone", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const body = req.body as { timezone?: string };

    if (!body.timezone) {
      return { ok: false, error: "timezone is required" };
    }

    // Validate timezone is a valid IANA timezone
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: body.timezone });
    } catch {
      return { ok: false, error: "Invalid timezone. Please use IANA format (e.g., America/New_York)" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { timezone: body.timezone },
    });

    return { ok: true, timezone: body.timezone };
  });

  app.get("/linked", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const accounts = await prisma.gameAccount.findMany({ where: { userId: user.id } });
    return { accounts };
  });

  /**
   * GET /me/library
   * Returns all linked games AND Steam library games with comprehensive stats
   */
  app.get("/library", async (req: AuthedRequest) => {
    const user = await requireUser(req);

    // Get all game accounts (CS2, Marvel Rivals, Clash Royale, Brawl Stars, etc.)
    const accounts = await prisma.gameAccount.findMany({
      where: { userId: user.id },
      orderBy: { linkedAt: "desc" },
    });

    // Get user's game preferences
    const preferences = await prisma.userGamePreference.findMany({
      where: { userId: user.id },
    });
    const prefMap = new Map(preferences.map(p => [p.steamAppId, p]));

    // Map raw Steam games to library items
    function mapSteamGames(games: any[]) {
      return games
        .map((g: any) => {
          const pref = prefMap.get(g.appid);
          return {
            id: `steam_${g.appid}`,
            type: "steam_library" as const,
            game: "STEAM",
            appId: g.appid,
            name: g.name,
            playtimeMinutes: g.playtime_forever,
            playtime2Weeks: g.playtime_2weeks || 0,
            iconUrl: g.img_icon_url
              ? `http://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
              : undefined,
            headerUrl: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
            isFavorite: pref?.isFavorite ?? false,
            wantTracking: pref?.wantTracking ?? false,
          };
        })
        .sort((a: any, b: any) => {
          if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
          return b.playtimeMinutes - a.playtimeMinutes;
        });
    }

    // Get Steam library games from S3, fall back to Redis cache
    let steamLibraryGames: any[] = [];
    try {
      const keys = await listObjects(`raw/steam_library/${user.id}/`);
      const latest = keys.sort().pop();
      if (latest) {
        const json = await getObject(latest);
        if (json) {
          const raw = JSON.parse(json);
          steamLibraryGames = mapSteamGames(raw.games ?? []);
        }
      }
    } catch (e) {
      console.error("Failed to fetch Steam library from S3:", e);
    }

    // Redis fallback when S3 is empty/unavailable
    if (steamLibraryGames.length === 0 && redis) {
      try {
        const cached = await redis.get(`steam_library:${user.id}`);
        if (cached) {
          const raw = JSON.parse(cached);
          steamLibraryGames = mapSteamGames(raw.games ?? []);
        }
      } catch (e) {
        console.error("Failed to fetch Steam library from Redis:", e);
      }
    }

    // Build linked game accounts data
    const linkedGames = await Promise.all(
      accounts.map(async (account) => {
        // Get match statistics
        const matchStats = await prisma.match.aggregate({
          where: { userId: user.id, game: account.game },
          _count: { id: true },
          _avg: { durationSeconds: true },
        });

        // Get wins/losses
        const wins = await prisma.match.count({
          where: { userId: user.id, game: account.game, result: "WIN" },
        });
        const losses = await prisma.match.count({
          where: { userId: user.id, game: account.game, result: "LOSS" },
        });

        // Get latest rank
        const latestRank = await getLatestRank(user.id, account.game);

        // Get latest stat snapshot for cumulative stats
        const latestSnapshot = await prisma.statSnapshot.findFirst({
          where: { userId: user.id, game: account.game },
          orderBy: { capturedAt: "desc" },
        });

        // Get aggregated stats from recent matches
        const recentMatches = await prisma.match.findMany({
          where: { userId: user.id, game: account.game },
          orderBy: { endedAt: "desc" },
          take: 50,
          select: { normalizedStats: true, result: true, endedAt: true },
        });

        // Calculate aggregate stats from matches
        let totalKills = 0, totalDeaths = 0, totalAssists = 0;
        let totalDamage = 0, totalHealing = 0;
        let totalCrowns = 0, totalTrophyChange = 0;

        for (const match of recentMatches) {
          const stats = match.normalizedStats as any;
          if (stats) {
            totalKills += stats.kills || 0;
            totalDeaths += stats.deaths || 0;
            totalAssists += stats.assists || 0;
            totalDamage += stats.damageDealt || 0;
            totalHealing += stats.healingDone || 0;
            totalCrowns += stats.crowns || 0;
            totalTrophyChange += stats.trophyChange || 0;
          }
        }

        const matchCount = recentMatches.length;

        // Build game-specific stats object
        const gameStats: Record<string, any> = {
          totalMatches: matchStats._count.id,
          wins,
          losses,
          winRate: matchStats._count.id > 0 ? (wins / matchStats._count.id * 100).toFixed(1) : null,
          avgMatchDuration: matchStats._avg.durationSeconds
            ? Math.round(matchStats._avg.durationSeconds / 60)
            : null,
        };

        // Add game-specific stats based on what's available
        if (account.game === "CS2") {
          const snapshot = latestSnapshot?.stats as any;
          gameStats.totalKills = snapshot?.kills || totalKills;
          gameStats.totalDeaths = snapshot?.deaths || totalDeaths;
          gameStats.totalAssists = snapshot?.assists || totalAssists;
          gameStats.totalHeadshots = snapshot?.headshots || 0;
          gameStats.totalMVPs = snapshot?.mvp || 0;
          gameStats.totalPlants = snapshot?.plants || 0;
          gameStats.totalDefuses = snapshot?.defuses || 0;
          gameStats.kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : null;
          if (snapshot?.extra) {
            gameStats.totalDamageDone = snapshot.extra.totalDamageDone;
            gameStats.accuracy = snapshot.extra.totalShotsFired > 0
              ? ((snapshot.extra.totalShotsHit / snapshot.extra.totalShotsFired) * 100).toFixed(1)
              : null;
          }
        } else if (account.game === "MARVEL_RIVALS") {
          gameStats.totalKills = totalKills;
          gameStats.totalDeaths = totalDeaths;
          gameStats.totalAssists = totalAssists;
          gameStats.totalDamageDealt = totalDamage;
          gameStats.totalHealingDone = totalHealing;
          gameStats.kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : null;
          if (matchCount > 0) {
            gameStats.avgKills = (totalKills / matchCount).toFixed(1);
            gameStats.avgDeaths = (totalDeaths / matchCount).toFixed(1);
            gameStats.avgAssists = (totalAssists / matchCount).toFixed(1);
          }
        } else if (account.game === "CLASH_ROYALE") {
          gameStats.totalCrowns = totalCrowns;
          gameStats.avgCrowns = matchCount > 0 ? (totalCrowns / matchCount).toFixed(1) : null;
          if (latestRank?.meta) {
            const meta = latestRank.meta as any;
            gameStats.bestTrophies = meta.bestTrophies;
            gameStats.expLevel = meta.expLevel;
            gameStats.arenaName = latestRank.rankTier;
          }
        } else if (account.game === "BRAWL_STARS") {
          gameStats.totalTrophyChange = totalTrophyChange;
          if (latestRank?.meta) {
            const meta = latestRank.meta as any;
            gameStats.highestTrophies = meta.highestTrophies;
            gameStats.expLevel = meta.expLevel;
            gameStats.soloVictories = meta.soloVictories;
            gameStats.duoVictories = meta.duoVictories;
            gameStats.trioVictories = meta.trioVictories;
          }
        } else if (account.game === "VALORANT") {
          gameStats.totalKills = totalKills;
          gameStats.totalDeaths = totalDeaths;
          gameStats.totalAssists = totalAssists;
          gameStats.kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : null;
          if (matchCount > 0) {
            gameStats.avgKills = (totalKills / matchCount).toFixed(1);
            gameStats.avgDeaths = (totalDeaths / matchCount).toFixed(1);
            gameStats.avgAssists = (totalAssists / matchCount).toFixed(1);
          }
          // Show region from account meta
          const accountMeta = account.meta as any;
          if (accountMeta?.region) {
            gameStats.region = accountMeta.region;
          }
        }

        // Get first and last match dates
        const firstMatch = await prisma.match.findFirst({
          where: { userId: user.id, game: account.game },
          orderBy: { endedAt: "asc" },
          select: { endedAt: true },
        });
        const lastMatch = await prisma.match.findFirst({
          where: { userId: user.id, game: account.game },
          orderBy: { endedAt: "desc" },
          select: { endedAt: true },
        });

        return {
          id: account.id,
          type: "linked_account" as const,
          game: account.game,
          provider: account.provider,
          displayName: account.displayName,
          externalId: account.externalId,
          linkedAt: account.linkedAt.toISOString(),
          rank: latestRank ? {
            tier: latestRank.rankTier,
            division: latestRank.rankDivision,
            numeric: latestRank.rankNumeric,
            percentile: latestRank.percentile,
          } : null,
          stats: gameStats,
          firstMatchAt: firstMatch?.endedAt?.toISOString() || null,
          lastMatchAt: lastMatch?.endedAt?.toISOString() || null,
        };
      })
    );

    return {
      linkedGames,
      steamLibrary: steamLibraryGames,
      totalGames: linkedGames.length + steamLibraryGames.length,
    };
  });

  /**
   * POST /me/library/refresh-steam
   * Manually refresh Steam library data from Steam API
   */
  app.post("/library/refresh-steam", async (req: AuthedRequest) => {
    const user = await requireUser(req);

    // Find Steam account (CS2 accounts are typically Steam)
    const steamAccount = await prisma.gameAccount.findFirst({
      where: {
        userId: user.id,
        provider: "STEAM",
      },
    });

    if (!steamAccount) {
      return {
        ok: false,
        error: "No Steam account linked. Please link your Steam account first.",
        gamesFound: 0,
      };
    }

    try {
      console.log(`[Steam Library] Refreshing for user ${user.id}, Steam ID: ${steamAccount.externalId}`);

      const games = await fetchSteamLibrary(steamAccount.externalId);

      console.log(`[Steam Library] Fetched ${games.length} games from Steam API`);

      if (games.length === 0) {
        return {
          ok: false,
          error: "Steam returned 0 games. Your Steam profile's game details may be set to private. Go to Steam > Profile > Edit Profile > Privacy Settings and set 'Game details' to 'Public'.",
          gamesFound: 0,
        };
      }

      // Store to S3
      const body = JSON.stringify({ games, date: new Date().toISOString() });
      const key = `raw/steam_library/${user.id}/${Date.now()}.json`;
      await putObject({ key, body, contentType: "application/json", cacheControl: "private, max-age=0" });

      // Also cache in Redis (fallback when S3 is not configured)
      if (redis) {
        try {
          await redis.set(`steam_library:${user.id}`, body, "EX", 86400 * 7); // 7-day TTL
        } catch (e) {
          console.error("[Steam Library] Redis cache write failed:", e);
        }
      }

      console.log(`[Steam Library] Stored ${games.length} games for user ${user.id}`);

      return {
        ok: true,
        gamesFound: games.length,
        message: `Successfully refreshed Steam library with ${games.length} games.`,
      };
    } catch (e: any) {
      console.error("[Steam Library] Refresh failed:", e);
      return {
        ok: false,
        error: e.message || "Failed to fetch Steam library. Please try again later.",
        gamesFound: 0,
      };
    }
  });

  /**
   * GET /me/library/preferences
   * Returns all user's game preferences (favorites and tracking requests)
   */
  app.get("/library/preferences", async (req: AuthedRequest) => {
    const user = await requireUser(req);

    const preferences = await prisma.userGamePreference.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return { preferences };
  });

  /**
   * POST /me/library/preferences
   * Set or update preference for a Steam game
   * Body: { steamAppId: number, gameName: string, isFavorite?: boolean, wantTracking?: boolean }
   */
  app.post("/library/preferences", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const body = req.body as {
      steamAppId: number;
      gameName: string;
      isFavorite?: boolean;
      wantTracking?: boolean;
    };

    if (!body.steamAppId || !body.gameName) {
      return { ok: false, error: "steamAppId and gameName are required" };
    }

    const preference = await prisma.userGamePreference.upsert({
      where: {
        userId_steamAppId: {
          userId: user.id,
          steamAppId: body.steamAppId,
        },
      },
      create: {
        userId: user.id,
        steamAppId: body.steamAppId,
        gameName: body.gameName,
        isFavorite: body.isFavorite ?? false,
        wantTracking: body.wantTracking ?? false,
      },
      update: {
        ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite }),
        ...(body.wantTracking !== undefined && { wantTracking: body.wantTracking }),
      },
    });

    return { ok: true, preference };
  });

  /**
   * DELETE /me/library/preferences/:steamAppId
   * Remove a game preference
   */
  app.delete("/library/preferences/:steamAppId", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const steamAppId = parseInt((req.params as any).steamAppId, 10);

    if (isNaN(steamAppId)) {
      return { ok: false, error: "Invalid steamAppId" };
    }

    await prisma.userGamePreference.deleteMany({
      where: {
        userId: user.id,
        steamAppId,
      },
    });

    return { ok: true };
  });
}
