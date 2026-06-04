import { prisma } from "../../../prisma";
import type { GameAccount } from "@prisma/client";
import { env } from "../../../env";
import { saveRankSnapshot } from "../rankTracking";
import {
  henrikGetAccount,
  henrikGetMatches,
  henrikGetMmr,
  henrikGetLifetimeMatches,
  HENRIK_REGIONS,
  type HenrikRegion,
  type HenrikMatch,
  type HenrikMatchPlayer,
} from "./henrikApi";
import { STRANDED_GAP_MS, isStranded } from "./strandedGap";

// Map the coarse stored region (americas/europe/asia) to a Henrik region slug.
// Only used as a last-resort fallback — we prefer Henrik's auto-detected region.
const regionMap: Record<string, HenrikRegion> = {
  americas: "na",
  europe: "eu",
  asia: "ap",
};

// Stranded pre-tracking outlier detection (see strandedGap.ts). Re-exported for
// back-compat with callers that imported it from here.
export { STRANDED_GAP_MS };

/**
 * Determine the correct Henrik region for an account.
 *
 * The region matters: querying matches/MMR with the wrong region returns an
 * empty list (HTTP 200, no error), so ingestion silently produces nothing.
 *
 * Order of preference:
 *  1. Live auto-detect via the account endpoint (authoritative). We also persist
 *     it back to `meta.henrikRegion` so future runs are correct and cheap — this
 *     self-heals accounts linked before region auto-detection existed.
 *  2. A previously-persisted `meta.henrikRegion`.
 *  3. The coarse user-picked region mapped through `regionMap` (default na).
 */
async function resolveHenrikRegion(
  account: GameAccount,
  name: string,
  tag: string
): Promise<HenrikRegion> {
  const meta = (account.meta as Record<string, any> | null) ?? {};

  // Already detected and persisted on a previous run — trust it and skip the
  // extra account-lookup call (saves a Henrik request on every refresh).
  const stored = meta.henrikRegion as HenrikRegion | undefined;
  if (stored && HENRIK_REGIONS.includes(stored)) return stored;

  // First time (or legacy account): detect via the account endpoint and persist.
  try {
    const acct = await henrikGetAccount(name, tag);
    const detected = acct.region?.toLowerCase() as HenrikRegion | undefined;
    if (detected && HENRIK_REGIONS.includes(detected)) {
      await prisma.gameAccount.update({
        where: { id: account.id },
        data: { meta: { ...meta, henrikRegion: detected } },
      });
      console.log(`[Valorant] Auto-detected region for ${name}#${tag}: ${detected} (persisted)`);
      return detected;
    }
  } catch (err: any) {
    console.warn(`[Valorant] Region auto-detect failed for ${name}#${tag}: ${err.message}`);
  }

  return regionMap[meta.region || "americas"] || "na";
}

export async function ingestValorantAccount(account: GameAccount) {
  console.log(`[Valorant] Starting ingest for account ${account.id} (${account.displayName}), game=${account.game}, provider=${account.provider}`);
  console.log(`[Valorant] Henrik API key present: ${Boolean(env.HENRIK_API_KEY)}`);

  // Parse name#tag from displayName
  const parts = (account.displayName || "").split("#");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    console.error(`[Valorant] Invalid displayName format: "${account.displayName}"`);
    return { inserted: 0, matchHistoryError: "Invalid Riot ID format in account" };
  }
  const [name, tag] = parts;
  console.log(`[Valorant] Parsed name="${name}" tag="${tag}"`);

  // Resolve the correct Henrik region (auto-detected + self-healing). A wrong
  // region makes the matches endpoint return [] with no error, which is the
  // single most common reason Valorant ingest "does nothing".
  const henrikRegion = await resolveHenrikRegion(account, name, tag);
  console.log(`[Valorant] Using Henrik region: ${henrikRegion}`);

  let inserted = 0;
  let matchHistoryError: string | null = null;

  // ── 1. Fetch MMR / Rank ──────────────────────────────────────────
  try {
    const mmr = await henrikGetMmr(henrikRegion, name, tag);
    // v2 MMR nests the live rank under `current_data` (NOT the top level).
    const current = mmr.current_data;
    if (current && current.currenttier > 0) {
      await saveRankSnapshot({
        userId: account.userId,
        gameAccountId: account.id,
        game: "VALORANT",
        source: "HENRIK_API",
        rankData: {
          rankTier: current.currenttierpatched,
          rankNumeric: current.elo,
          meta: {
            tier: current.currenttier,
            rr: current.ranking_in_tier,
            mmrChange: current.mmr_change_to_last_game,
          },
        },
      });
      console.log(`[Valorant] Saved rank for ${name}#${tag}: ${current.currenttierpatched} (${current.ranking_in_tier} RR)`);
    }
  } catch (err: any) {
    console.warn(`[Valorant] Failed to fetch MMR for ${name}#${tag}: ${err.message}`);
  }

  // ── 2. Fetch recent matches (v3 – full detail, up to 10) ────────
  try {
    const matches = await henrikGetMatches(henrikRegion, name, tag, { size: 10 });

    if (!matches || matches.length === 0) {
      // Empty (not an error) usually means the region is off or the account has
      // no recent games Henrik has indexed yet.
      matchHistoryError = `No recent matches returned for region "${henrikRegion}". If you've played recently, the account's region may differ.`;
      console.warn(`[Valorant] 0 matches returned for ${name}#${tag} in region ${henrikRegion}`);
    } else {
      for (const match of matches) {
        const matchId = `val_${match.metadata.matchid}`;

        // Skip if already ingested
        const exists = await prisma.match.findUnique({ where: { game_matchId: { game: "VALORANT", matchId } } });
        if (exists) continue;

        // Find this player in the match
        const player = match.players.all_players.find(
          (p) => p.name.toLowerCase() === name.toLowerCase() && p.tag.toLowerCase() === tag.toLowerCase()
        );
        if (!player) continue;

        const result = getMatchResult(player, match);
        const stats = normalizePlayerStats(player, match);
        const isRanked = match.metadata.mode?.toLowerCase() === "competitive";

        const startTime = new Date(match.metadata.game_start * 1000);
        const durationSeconds = match.metadata.game_length;

        await prisma.match.create({
          data: {
            matchId,
            userId: account.userId,
            gameAccountId: account.id,
            game: "VALORANT",
            mode: isRanked ? "RANKED" : match.metadata.mode?.toUpperCase() || "CASUAL",
            map: match.metadata.map,
            startedAt: startTime,
            endedAt: new Date(startTime.getTime() + durationSeconds * 1000),
            durationSeconds,
            result,
            normalizedStats: stats,
            source: "HENRIK_API",
            ingestedAt: new Date(),
          },
        });
        inserted++;

        // Save rank snapshot for ranked matches
        if (isRanked && player.currenttier > 0) {
          await saveRankSnapshot({
            userId: account.userId,
            gameAccountId: account.id,
            game: "VALORANT",
            source: "HENRIK_API",
            rankData: {
              rankTier: player.currenttier_patched,
              rankNumeric: player.currenttier,
              meta: {
                seasonId: match.metadata.season_id,
                map: match.metadata.map,
              },
            },
          });
        }
      }
    }

    console.log(`[Valorant] Ingested ${inserted} new matches for ${name}#${tag}`);
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("404")) {
      matchHistoryError = "No match history found for this account.";
    } else if (msg.includes("429")) {
      matchHistoryError = "Rate limited – try again in a minute.";
    } else {
      matchHistoryError = `Failed to fetch matches: ${msg}`;
    }
    console.error(`[Valorant] Match fetch error for ${name}#${tag}: ${msg}`);
  }

  // ── 3. Backfill / gap-fill from the paginated lifetime endpoint ──
  // Walk lifetime history across ALL modes (not just competitive) until we reach
  // a page that's entirely already-ingested. This fills both the gaps the recent
  // (full-detail) fetch can't reach and matches missed between refreshes. The v3
  // fetch above runs first so those matches keep their richer stats; lifetime only
  // adds what isn't already stored.
  try {
    const PAGE_SIZE = 25;
    const MAX_PAGES = 5; // safety cap (~125 matches) to stay within Henrik rate limits

    // Anchor the stranded-gap check against the most recent match we already have
    // so the cutoff is measured against the real history, not just this run.
    const newestExisting = await prisma.match.findFirst({
      where: { userId: account.userId, game: "VALORANT", startedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    });
    let prevStartMs: number | null = newestExisting?.startedAt?.getTime() ?? null;
    let stranded = false;

    for (let page = 1; page <= MAX_PAGES && !stranded; page++) {
      const lifetime = await henrikGetLifetimeMatches(henrikRegion, name, tag, { size: PAGE_SIZE, page });
      if (!lifetime || lifetime.length === 0) break;

      let newInPage = 0;
      for (const lm of lifetime) {
        const startTime = new Date(lm.meta.started_at);
        if (isNaN(startTime.getTime())) continue; // skip malformed timestamps
        const startMs = startTime.getTime();

        // Lifetime is returned newest→oldest. Once we fall off a cliff into
        // stranded pre-tracking history, stop — don't ingest the outlier or
        // anything older than it.
        if (isStranded(prevStartMs, startMs)) {
          console.log(`[Valorant] Stopping backfill at stranded outlier ${startTime.toISOString()} (>1y gap) for ${name}#${tag}`);
          stranded = true;
          break;
        }
        prevStartMs = startMs;

        const matchId = `val_${lm.meta.id}`;
        const exists = await prisma.match.findUnique({ where: { game_matchId: { game: "VALORANT", matchId } } });
        if (exists) continue;

        // Determine result from round scores (deathmatch/other modes → DRAW).
        const playerTeam = (lm.stats.team || "").toLowerCase(); // "red" | "blue"
        const teamRounds = playerTeam === "red" ? lm.teams.red : lm.teams.blue;
        const enemyRounds = playerTeam === "red" ? lm.teams.blue : lm.teams.red;
        const result: "WIN" | "LOSS" | "DRAW" =
          teamRounds > enemyRounds ? "WIN" : teamRounds < enemyRounds ? "LOSS" : "DRAW";

        const modeRaw = lm.meta.mode || "";

        await prisma.match.create({
          data: {
            matchId,
            userId: account.userId,
            gameAccountId: account.id,
            game: "VALORANT",
            mode: modeRaw.toLowerCase() === "competitive" ? "RANKED" : modeRaw.toUpperCase() || "CASUAL",
            map: lm.meta.map?.name || null,
            startedAt: startTime,
            endedAt: startTime, // lifetime endpoint doesn't expose duration
            durationSeconds: 0,
            result,
            normalizedStats: {
              kills: lm.stats.kills,
              deaths: lm.stats.deaths,
              assists: lm.stats.assists,
              score: lm.stats.score,
              headshots: lm.stats.shots?.head || 0,
              bodyshots: lm.stats.shots?.body || 0,
              legshots: lm.stats.shots?.leg || 0,
              damage: lm.stats.damage?.made || 0,
              damageReceived: lm.stats.damage?.received || 0,
              agent: lm.stats.character?.name || null,
              competitiveTier: lm.stats.tier,
              teamRoundsWon: teamRounds,
              teamRoundsLost: enemyRounds,
            },
            source: "HENRIK_API",
            ingestedAt: new Date(),
          },
        });
        inserted++;
        newInPage++;
      }

      // A page with no new matches means we've caught up to what's already stored.
      if (newInPage === 0) break;
    }

    console.log(`[Valorant] Total new matches after backfill for ${name}#${tag}: ${inserted}`);
  } catch (err: any) {
    console.warn(`[Valorant] Backfill failed for ${name}#${tag}: ${err.message}`);
  }

  // If we ended up ingesting anything, the earlier "no recent matches" note was a
  // false alarm (e.g. recent fetch was empty but history existed).
  if (inserted > 0) matchHistoryError = null;

  return { inserted, matchHistoryError };
}

// ─── Helpers ───────────────────────────────────────────────────────

function getMatchResult(
  player: HenrikMatchPlayer,
  match: HenrikMatch
): "WIN" | "LOSS" | "DRAW" {
  const team = player.team.toLowerCase(); // "red" | "blue"
  const teamData = team === "red" ? match.teams.red : match.teams.blue;

  if (!teamData) return "DRAW";
  return teamData.has_won ? "WIN" : teamData.rounds_won === (team === "red" ? match.teams.blue : match.teams.red).rounds_won ? "DRAW" : "LOSS";
}

function normalizePlayerStats(
  player: HenrikMatchPlayer,
  match: HenrikMatch
): Record<string, any> {
  const team = player.team.toLowerCase();
  const teamData = team === "red" ? match.teams.red : match.teams.blue;
  const enemyData = team === "red" ? match.teams.blue : match.teams.red;

  return {
    kills: player.stats.kills,
    deaths: player.stats.deaths,
    assists: player.stats.assists,
    score: player.stats.score,
    headshots: player.stats.headshots,
    bodyshots: player.stats.bodyshots,
    legshots: player.stats.legshots,
    damage: player.damage_made,
    damageReceived: player.damage_received,
    agent: player.character,
    competitiveTier: player.currenttier,
    competitiveTierPatched: player.currenttier_patched,
    roundsPlayed: match.metadata.rounds_played,
    teamRoundsWon: teamData?.rounds_won || 0,
    teamRoundsLost: enemyData?.rounds_won || 0,
    abilityCasts: player.ability_casts,
    economySpent: player.economy?.spent?.overall || 0,
    economyAvgSpent: player.economy?.spent?.average || 0,
  };
}
