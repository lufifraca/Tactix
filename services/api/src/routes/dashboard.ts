import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { ensureDailyQuests, ensureDailyBrief, recomputeQuestProgress } from "../services/quests/questEngine";
import { getSkillScoresForDashboard, upsertDailySkillScores, computeCrossGameSkillScores } from "../services/skills/scoring";
import { evaluateQuest } from "../services/quests/scoring";
import { env } from "../env";
import { encodeS3Key } from "../services/storage";
import { getLatestRank } from "../services/ingest/rankTracking";
import { getSessionInsights } from "../services/sessions";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function toPublicReward(r: any) {
  const imageUrl = `${env.S3_PUBLIC_BASE_URL}/${encodeS3Key(r.assetS3Key)}`;
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    caption: r.caption,
    imageUrl,
    isPublic: r.isPublic,
    shareUrl: r.isPublic ? `${env.WEB_BASE_URL}/share/${r.shareId}` : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const Query = z.object({ mode: z.enum(["ALL", "RANKED", "UNRANKED"]).optional().default("ALL") });
    const { mode } = Query.parse(req.query);

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    const subscriptionActive = sub?.status === "ACTIVE";

    const dateStr = todayUtc();
    const questCount = subscriptionActive ? 3 : 1;

    // These init calls are non-critical — a failure shouldn't block the dashboard
    try {
      await ensureDailyQuests(user.id, dateStr, questCount, subscriptionActive);
      await recomputeQuestProgress(user.id, dateStr);
    } catch (e) {
      console.error("Quest init failed (non-fatal):", e);
    }

    try {
      await ensureDailyBrief(user.id, dateStr);
    } catch (e) {
      console.error("Daily brief init failed (non-fatal):", e);
    }

    // Skill scores — also non-critical
    let skills: Array<{ domain: string; score: number; delta7d: number; details: any; attribution: any }> = [];
    try {
      const latestSkill = await prisma.skillScore.findFirst({
        where: { userId: user.id, game: null },
        orderBy: { computedAt: "desc" },
        select: { computedAt: true, domain: true },
      });

      const isLegacy = latestSkill?.domain === "AIM_QUALITY";
      const needSkill = !latestSkill || isLegacy || Date.now() - latestSkill.computedAt.getTime() > 6 * 60 * 60 * 1000;

      if (needSkill) await upsertDailySkillScores(user.id, dateStr);

      const deltas = await getSkillScoresForDashboard(user.id);
      const live = await computeCrossGameSkillScores(user.id, mode);
      skills = live.map((s) => {
        const d = deltas.find((x) => x.domain === s.domain);
        return { domain: s.domain, score: s.score, delta7d: d?.delta7d ?? 0, details: s.details, attribution: s.attribution };
      });
    } catch (e) {
      console.error("Skill scores failed (non-fatal):", e);
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const brief = await prisma.dailyBrief.findUnique({ where: { userId_date: { userId: user.id, date } } });

    const quests = await prisma.quest.findMany({ where: { userId: user.id, date }, orderBy: { slot: "asc" } });

    const modeFilter =
      mode === "ALL"
        ? undefined
        : mode === "RANKED"
          ? { in: ["RANKED", "UNKNOWN"] as any }
          : { in: ["UNRANKED", "UNKNOWN"] as any };



    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const progressByQuestId: Record<string, any> = {};
    if (mode !== "ALL") {
      for (const q of quests) {
        const criteria = q.criteria as any;
        const matches = await prisma.match.findMany({
          where: {
            userId: user.id,
            endedAt: { gte: dayStart, lt: dayEnd },
            ...(criteria?.game ? { game: criteria.game } : {}),
            ...(modeFilter ? { mode: modeFilter } : {}),
          },
          select: { normalizedStats: true },
        });
        const enriched = matches.map((m) => ({ stats: { ...(m.normalizedStats as any), matchesPlayed: 1 } }));
        progressByQuestId[q.id] = evaluateQuest(criteria, enriched as any);
      }
    }

    const rewards = await prisma.reward.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const lastIngest = await prisma.match.findFirst({
      where: { userId: user.id },
      orderBy: { ingestedAt: "desc" },
      select: { ingestedAt: true },
    });

    let library: any[] = [];
    try {
      const { listObjects, getObject } = await import("../services/storage");
      const keys = await listObjects(`raw/steam_library/${user.id}/`);
      const latest = keys.sort().pop();
      if (latest) {
        const json = await getObject(latest);
        if (json) {
          const raw = JSON.parse(json);
          library = (raw.games ?? [])
            .sort((a: any, b: any) => b.playtime_forever - a.playtime_forever)
            .slice(0, 6)
            .map((g: any) => ({
              name: g.name,
              playtimeMinutes: g.playtime_forever,
              iconUrl: g.img_icon_url ? `http://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg` : undefined,
            }));
        }
      }
    } catch (e) {
      console.error("Library fetch failed", e);
    }

    // Fetch latest ranks for all games
    let ranks: Record<string, any> = {};
    try {
      const gameAccounts = await prisma.gameAccount.findMany({
        where: { userId: user.id },
        select: { game: true },
        distinct: ["game"],
      });

      for (const acc of gameAccounts) {
        const latestRank = await getLatestRank(user.id, acc.game);
        if (latestRank) {
          // Get previous rank for comparison
          const prevRank = await prisma.rankSnapshot.findFirst({
            where: {
              userId: user.id,
              game: acc.game,
              id: { not: latestRank.id },
            },
            orderBy: { capturedAt: "desc" },
          });

          const numericChange = prevRank && latestRank.rankNumeric && prevRank.rankNumeric
            ? latestRank.rankNumeric - prevRank.rankNumeric
            : null;

          ranks[acc.game] = {
            game: latestRank.game,
            rankTier: latestRank.rankTier,
            rankDivision: latestRank.rankDivision,
            rankNumeric: latestRank.rankNumeric,
            percentile: latestRank.percentile,
            capturedAt: latestRank.capturedAt.toISOString(),
            change: numericChange,
            trend: numericChange === null ? null : numericChange > 0 ? "up" : numericChange < 0 ? "down" : "stable",
          };
        }
      }
    } catch (e) {
      console.error("Rank fetch failed", e);
    }

    // Fetch session insights and tilt alert (lightweight version for dashboard)
    let sessionInsights = undefined;
    let tiltAlert = undefined;
    try {
      console.log("DEBUG: Fetching session insights for user:", user.id);
      const insights = await getSessionInsights(user.id, null); // Overall insights
      console.log("DEBUG: Session insights fetched, totalMatches:", insights?.totalMatchesAnalyzed);
      sessionInsights = insights;
      tiltAlert = insights.tiltAlert;
    } catch (e) {
      console.error("Session insights fetch failed:", e);
    }

    // ── Today's Performance Summary ──────────────────────────────────
    let todayPerformance = undefined;
    try {
      const todayMatches = await prisma.match.findMany({
        where: {
          userId: user.id,
          startedAt: { gte: dayStart, lt: dayEnd },
        },
        select: {
          game: true,
          result: true,
          durationSeconds: true,
          normalizedStats: true,
        },
      });

      const byGame: Record<string, { matchesPlayed: number; wins: number }> = {};
      let totalKills = 0, totalDeaths = 0, totalAssists = 0, timePlayedSeconds = 0;
      let wins = 0, losses = 0, draws = 0;

      for (const m of todayMatches) {
        if (m.result === "WIN") wins++;
        else if (m.result === "LOSS") losses++;
        else draws++;

        timePlayedSeconds += m.durationSeconds || 0;

        const stats = m.normalizedStats as any;
        if (stats) {
          totalKills += stats.kills || 0;
          totalDeaths += stats.deaths || 0;
          totalAssists += stats.assists || 0;
        }

        if (!byGame[m.game]) byGame[m.game] = { matchesPlayed: 0, wins: 0 };
        byGame[m.game].matchesPlayed++;
        if (m.result === "WIN") byGame[m.game].wins++;
      }

      todayPerformance = {
        matchesPlayed: todayMatches.length,
        wins,
        losses,
        draws,
        winRate: todayMatches.length > 0 ? wins / todayMatches.length : null,
        totalKills,
        totalDeaths,
        totalAssists,
        timePlayedSeconds,
        byGame,
      };
    } catch (e) {
      console.error("Today performance fetch failed:", e);
    }

    // ── Streaks & Milestones ─────────────────────────────────────────
    let streaksAndMilestones = undefined;
    try {
      // Quest streak from Streak model
      const streak = await prisma.streak.findUnique({ where: { userId: user.id } });
      const questStreak = {
        current: streak?.current ?? 0,
        best: streak?.best ?? 0,
      };

      // Per-game win/loss streaks (from last 20 matches per game)
      const gameAccounts = await prisma.gameAccount.findMany({
        where: { userId: user.id },
        select: { game: true },
        distinct: ["game"],
      });

      const gameStreaks: Array<{ game: string; currentStreak: number; streakType: "WIN" | "LOSS" | null }> = [];

      for (const acc of gameAccounts) {
        const recentMatches = await prisma.match.findMany({
          where: { userId: user.id, game: acc.game },
          orderBy: { endedAt: "desc" },
          take: 20,
          select: { result: true },
        });

        if (recentMatches.length === 0) continue;

        // Count consecutive results from most recent
        const firstResult = recentMatches[0].result;
        if (firstResult !== "WIN" && firstResult !== "LOSS") {
          gameStreaks.push({ game: acc.game, currentStreak: 0, streakType: null });
          continue;
        }

        let count = 0;
        for (const m of recentMatches) {
          if (m.result === firstResult) count++;
          else break;
        }

        gameStreaks.push({
          game: acc.game,
          currentStreak: count,
          streakType: firstResult as "WIN" | "LOSS",
        });
      }

      // Milestones: total match counts, game-specific achievements
      const milestones: Array<{ type: string; label: string; game: string | null; value: number }> = [];

      const totalMatchCount = await prisma.match.count({ where: { userId: user.id } });
      // Milestone thresholds
      const thresholds = [10, 25, 50, 100, 250, 500, 1000];
      const latestThreshold = thresholds.filter(t => totalMatchCount >= t).pop();
      if (latestThreshold) {
        milestones.push({
          type: "total_matches",
          label: `${latestThreshold} matches played`,
          game: null,
          value: latestThreshold,
        });
      }

      // Per-game match milestones
      for (const acc of gameAccounts) {
        const gameCount = await prisma.match.count({ where: { userId: user.id, game: acc.game } });
        const gameThreshold = thresholds.filter(t => gameCount >= t).pop();
        if (gameThreshold && gameThreshold >= 10) {
          milestones.push({
            type: "game_matches",
            label: `${gameThreshold} ${acc.game} matches`,
            game: acc.game,
            value: gameThreshold,
          });
        }
      }

      // Best win streak ever per game
      for (const gs of gameStreaks) {
        if (gs.streakType === "WIN" && gs.currentStreak >= 3) {
          milestones.push({
            type: "win_streak",
            label: `${gs.currentStreak} win streak`,
            game: gs.game,
            value: gs.currentStreak,
          });
        }
      }

      streaksAndMilestones = { questStreak, gameStreaks, milestones };
    } catch (e) {
      console.error("Streaks/milestones fetch failed:", e);
    }

    // Linked accounts for "Tracked Games" display
    const linkedAccounts = await prisma.gameAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        game: true,
        displayName: true,
        provider: true,
        linkedAt: true,
      },
      orderBy: { linkedAt: "desc" },
    });

    // Onboarding state
    const linkedAccountCount = linkedAccounts.length;
    const matchCount = await prisma.match.count({ where: { userId: user.id }, take: 1 });
    const onboardingState = linkedAccountCount === 0
      ? "NEEDS_GAME_LINK" as const
      : matchCount === 0
        ? "NEEDS_FIRST_INGEST" as const
        : "COMPLETE" as const;

    return {
      me: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      subscriptionActive,
      modeFilter: mode,
      onboardingState,
      dailyBrief: brief
        ? { date: dateStr, bullets: brief.bullets as any }
        : null,
      skillScores: skills,
      quests: quests.map((q) => ({
        id: q.id,
        date: dateStr,
        slot: q.slot,
        isPremium: q.isPremium,
        game: q.game,
        domain: q.domain,
        title: q.title,
        description: q.description,
        modeEligibility: q.modeEligibility,
        criteria: q.criteria,
        progress: (progressByQuestId[q.id] ?? q.progress) as any,
        status: q.status,
      })),
      rewards: rewards.map(toPublicReward),
      lastIngestAt: lastIngest?.ingestedAt?.toISOString() ?? null,
      library,
      ranks,
      linkedAccounts: linkedAccounts.map(a => ({
        id: a.id,
        game: a.game,
        displayName: a.displayName,
        provider: a.provider,
        linkedAt: a.linkedAt.toISOString(),
      })),
      sessionInsights,
      tiltAlert,
      todayPerformance,
      streaksAndMilestones,
    };
  });

  app.get("/rank-history/:game", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const { game } = req.params as { game: string };
    const Query = z.object({ limit: z.coerce.number().int().min(1).max(100).optional().default(30) });
    const { limit } = Query.parse(req.query);

    const history = await prisma.rankSnapshot.findMany({
      where: { userId: user.id, game },
      orderBy: { capturedAt: "asc" },
      take: limit,
      select: {
        rankTier: true,
        rankNumeric: true,
        capturedAt: true,
      },
    });

    return {
      game,
      history: history.map((h) => ({
        rankTier: h.rankTier,
        rankNumeric: h.rankNumeric,
        capturedAt: h.capturedAt.toISOString(),
      })),
    };
  });

  app.get("/character-breakdown", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const Query = z.object({ game: z.string().optional() });
    const { game: gameFilter } = Query.parse(req.query);

    // Only MARVEL_RIVALS and VALORANT have character/agent data
    const targetGames = gameFilter
      ? [gameFilter]
      : ["MARVEL_RIVALS", "VALORANT"];

    const matches = await prisma.match.findMany({
      where: {
        userId: user.id,
        game: { in: targetGames },
      },
      select: {
        game: true,
        result: true,
        normalizedStats: true,
      },
    });

    // Group by character
    const charMap = new Map<string, {
      character: string;
      game: string;
      wins: number;
      losses: number;
      totalKills: number;
      totalDeaths: number;
      totalAssists: number;
      hasKda: boolean;
    }>();

    for (const m of matches) {
      const stats = m.normalizedStats as Record<string, any> | null;
      if (!stats) continue;

      let character: string | null = null;
      if (m.game === "MARVEL_RIVALS") {
        character = stats.extra?.heroName || null;
      } else if (m.game === "VALORANT") {
        character = stats.agent || null;
      }
      if (!character) continue;

      const key = `${m.game}:${character}`;
      const existing = charMap.get(key) || {
        character,
        game: m.game,
        wins: 0,
        losses: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0,
        hasKda: false,
      };

      if (m.result === "WIN") existing.wins++;
      else existing.losses++;

      if (stats.kills != null) {
        existing.totalKills += stats.kills ?? 0;
        existing.totalDeaths += stats.deaths ?? 0;
        existing.totalAssists += stats.assists ?? 0;
        existing.hasKda = true;
      }

      charMap.set(key, existing);
    }

    const characters = Array.from(charMap.values())
      .map((c) => {
        const total = c.wins + c.losses;
        return {
          character: c.character,
          game: c.game,
          gamesPlayed: total,
          wins: c.wins,
          losses: c.losses,
          winRate: total > 0 ? Math.round((c.wins / total) * 100) : 0,
          avgKills: c.hasKda && total > 0 ? Math.round((c.totalKills / total) * 10) / 10 : null,
          avgDeaths: c.hasKda && total > 0 ? Math.round((c.totalDeaths / total) * 10) / 10 : null,
          avgAssists: c.hasKda && total > 0 ? Math.round((c.totalAssists / total) * 10) / 10 : null,
        };
      })
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    return {
      characters,
      totalGames: matches.length,
    };
  });

  app.post("/reset-daily", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const dateStr = todayUtc();
    const date = new Date(`${dateStr}T00:00:00.000Z`);

    // Delete today's generated content
    await prisma.quest.deleteMany({ where: { userId: user.id, date } });
    await prisma.dailyBrief.deleteMany({ where: { userId: user.id, date } });

    // Also delete recent skill scores to force recompute
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.skillScore.deleteMany({
      where: { userId: user.id, game: null, computedAt: { gte: since } }
    });

    return { ok: true };
  });

  // Admin-only: toggle Pro subscription (restricted to owner account)
  app.post("/debug/toggle-pro", async (req: AuthedRequest) => {
    const user = await requireUser(req);

    // Only allow the app owner to toggle Pro for testing
    if (user.email !== "lficanolatimer@gmail.com") {
      return { ok: false, error: "Unauthorized. Please subscribe through the normal billing flow." };
    }
    const existing = await prisma.subscription.findUnique({ where: { userId: user.id } });

    if (existing && existing.status === "ACTIVE") {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { status: "INACTIVE" },
      });
      return { ok: true, subscriptionActive: false };
    }

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      create: {
        userId: user.id,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    return { ok: true, subscriptionActive: true };
  });

  app.get("/skill/:domain", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const domain = (req.params as any).domain as string;

    // 1. History (last 30 entries)
    const history = await prisma.skillScore.findMany({
      where: { userId: user.id, domain, game: null },
      orderBy: { computedAt: "asc" },
      take: 30,
      select: { score: true, computedAt: true }
    });

    // 2. Latest Score & Attribution
    const latest = await prisma.skillScore.findFirst({
      where: { userId: user.id, domain, game: null },
      orderBy: { computedAt: "desc" },
    });

    if (!latest) return { history: [], matches: [], breakdown: null };

    // 3. Recent Relevant Matches
    // Filter matches by games that actually contributed to this score (from attributionCounts)
    const details = latest.details as any;
    const contributingGames = details?.attributionCounts ? Object.keys(details.attributionCounts) : [];

    const matches = await prisma.match.findMany({
      where: {
        userId: user.id,
        ...(contributingGames.length > 0 ? { game: { in: contributingGames } } : {})
      },
      orderBy: { endedAt: "desc" },
      take: 10,
      select: {
        id: true,
        game: true,
        result: true,
        mode: true,
        endedAt: true,
        normalizedStats: true,
      }
    });

    return {
      domain,
      score: latest.score,
      history: history.map(h => ({ date: h.computedAt.toISOString().slice(0, 10), score: h.score })),
      breakdown: details,
      matches: matches.map(m => ({
        ...m,
        date: m.endedAt?.toISOString(),
        stats: m.normalizedStats
      }))
    };
  });

  // ─── Match History ────────────────────────────────────────────
  app.get("/matches", async (req: AuthedRequest) => {
    const user = await requireUser(req);

    const Query = z.object({
      game: z.string().optional(),
      mode: z.enum(["ALL", "RANKED", "UNRANKED", "CASUAL", "DEATHMATCH", "COMPETITIVE"]).optional().default("ALL"),
      result: z.enum(["ALL", "WIN", "LOSS", "DRAW"]).optional().default("ALL"),
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    });
    const { game, mode, result, page, limit } = Query.parse(req.query);

    const where: any = { userId: user.id };
    if (game && game !== "ALL") where.game = game;
    if (mode && mode !== "ALL") where.mode = mode;
    if (result && result !== "ALL") where.result = result;

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: { endedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          game: true,
          matchId: true,
          mode: true,
          map: true,
          result: true,
          startedAt: true,
          endedAt: true,
          durationSeconds: true,
          normalizedStats: true,
          source: true,
          gameAccount: {
            select: { displayName: true },
          },
        },
      }),
      prisma.match.count({ where }),
    ]);

    return {
      matches: matches.map((m) => ({
        id: m.id,
        game: m.game,
        matchId: m.matchId,
        mode: m.mode,
        map: m.map,
        result: m.result,
        startedAt: m.startedAt?.toISOString() || null,
        endedAt: m.endedAt?.toISOString() || null,
        durationSeconds: m.durationSeconds,
        stats: m.normalizedStats,
        source: m.source,
        accountName: m.gameAccount?.displayName || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}
