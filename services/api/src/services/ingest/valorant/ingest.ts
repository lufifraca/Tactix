import { prisma } from "../../../prisma";
import type { GameAccount } from "@prisma/client";
import { env } from "../../../env";
import { saveRankSnapshot } from "../rankTracking";
import {
  henrikGetMatches,
  henrikGetMmr,
  henrikGetLifetimeMatches,
  type HenrikRegion,
  type HenrikMatch,
  type HenrikMatchPlayer,
} from "./henrikApi";

// Map stored region to Henrik region slug
const regionMap: Record<string, HenrikRegion> = {
  americas: "na",
  europe: "eu",
  asia: "ap",
};

export async function ingestValorantAccount(account: GameAccount) {
  console.log(`[Valorant] Starting ingest for account ${account.id} (${account.displayName}), game=${account.game}, provider=${account.provider}`);
  console.log(`[Valorant] Henrik API key present: ${Boolean(env.HENRIK_API_KEY)}`);

  const meta = account.meta as { region?: string; tag?: string } | null;
  const storedRegion = meta?.region || "americas";
  const henrikRegion: HenrikRegion = regionMap[storedRegion] || "na";
  console.log(`[Valorant] Region: ${storedRegion} → Henrik region: ${henrikRegion}`);

  // Parse name#tag from displayName
  const parts = (account.displayName || "").split("#");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    console.error(`[Valorant] Invalid displayName format: "${account.displayName}"`);
    return { inserted: 0, matchHistoryError: "Invalid Riot ID format in account" };
  }
  const [name, tag] = parts;
  console.log(`[Valorant] Parsed name="${name}" tag="${tag}"`);

  let inserted = 0;
  let matchHistoryError: string | null = null;

  // ── 1. Fetch MMR / Rank ──────────────────────────────────────────
  try {
    const mmr = await henrikGetMmr(henrikRegion, name, tag);
    if (mmr.currenttier > 0) {
      await saveRankSnapshot({
        userId: account.userId,
        gameAccountId: account.id,
        game: "VALORANT",
        source: "HENRIK_API",
        rankData: {
          rankTier: mmr.currenttierpatched,
          rankNumeric: mmr.elo,
          meta: {
            tier: mmr.currenttier,
            rr: mmr.ranking_in_tier,
            mmrChange: mmr.mmr_change_to_last_game,
          },
        },
      });
      console.log(`[Valorant] Saved rank for ${name}#${tag}: ${mmr.currenttierpatched} (${mmr.ranking_in_tier} RR)`);
    }
  } catch (err: any) {
    console.warn(`[Valorant] Failed to fetch MMR for ${name}#${tag}: ${err.message}`);
  }

  // ── 2. Fetch recent matches (v3 – full detail, last 5) ──────────
  try {
    const matches = await henrikGetMatches(henrikRegion, name, tag);

    if (matches && matches.length > 0) {
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

  // ── 3. Backfill: fetch older matches if this is the first ingest ──
  if (inserted > 0) {
    try {
      const totalMatches = await prisma.match.count({
        where: { userId: account.userId, game: "VALORANT" },
      });

      // If we have fewer than 10 matches, try to backfill from lifetime endpoint
      if (totalMatches < 10) {
        const lifetime = await henrikGetLifetimeMatches(henrikRegion, name, tag, {
          size: 20,
          mode: "competitive",
        });

        for (const lm of lifetime) {
          const matchId = `val_${lm.meta.id}`;
          const exists = await prisma.match.findUnique({ where: { game_matchId: { game: "VALORANT", matchId } } });
          if (exists) continue;

          // Determine result from round scores
          const playerTeam = lm.stats.team.toLowerCase(); // "red" or "blue"
          const teamRounds = playerTeam === "red" ? lm.teams.red : lm.teams.blue;
          const enemyRounds = playerTeam === "red" ? lm.teams.blue : lm.teams.red;
          const result: "WIN" | "LOSS" | "DRAW" =
            teamRounds > enemyRounds ? "WIN" : teamRounds < enemyRounds ? "LOSS" : "DRAW";

          const startTime = new Date(lm.meta.started_at);

          await prisma.match.create({
            data: {
              matchId,
              userId: account.userId,
              gameAccountId: account.id,
              game: "VALORANT",
              mode: lm.meta.mode?.toLowerCase() === "competitive" ? "RANKED" : lm.meta.mode?.toUpperCase() || "CASUAL",
              map: lm.meta.map?.name || null,
              startedAt: startTime,
              endedAt: startTime, // lifetime endpoint doesn't have duration
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
                teamRoundsWon: playerTeam === "red" ? lm.teams.red : lm.teams.blue,
                teamRoundsLost: playerTeam === "red" ? lm.teams.blue : lm.teams.red,
              },
              source: "HENRIK_API",
              ingestedAt: new Date(),
            },
          });
          inserted++;
        }
        console.log(`[Valorant] Backfilled to ${inserted} total new matches for ${name}#${tag}`);
      }
    } catch (err: any) {
      console.warn(`[Valorant] Backfill failed for ${name}#${tag}: ${err.message}`);
    }
  }

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
