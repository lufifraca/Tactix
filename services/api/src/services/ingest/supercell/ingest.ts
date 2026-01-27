import { prisma } from "../../../prisma";
import type { GameAccount } from "@prisma/client";
import { fetchClashRoyaleBattleLog, fetchBrawlStarsBattleLog, fetchClashRoyalePlayer, fetchBrawlStarsPlayer } from "./index";
import { saveRankSnapshot } from "../rankTracking";

export async function ingestSupercellAccount(account: GameAccount) {
    let matches: any[] = [];

    // Fetch player data for rank tracking
    try {
        if ((account.game as any) === "CLASH_ROYALE") {
            const player = await fetchClashRoyalePlayer(account.externalId);
            // Extract rank from trophies and league
            await saveRankSnapshot({
                userId: account.userId,
                gameAccountId: account.id,
                game: "CLASH_ROYALE",
                source: "SUPERCELL_API",
                rankData: {
                    rankTier: player.arena?.name || player.league?.name || null,
                    rankNumeric: player.trophies || null,
                    meta: {
                        bestTrophies: player.bestTrophies,
                        arenaId: player.arena?.id,
                        leagueId: player.league?.id,
                        expLevel: player.expLevel,
                    },
                },
            });
        } else if ((account.game as any) === "BRAWL_STARS") {
            const player = await fetchBrawlStarsPlayer(account.externalId);
            // Extract rank from trophies
            await saveRankSnapshot({
                userId: account.userId,
                gameAccountId: account.id,
                game: "BRAWL_STARS",
                source: "SUPERCELL_API",
                rankData: {
                    rankTier: null, // Brawl Stars doesn't have explicit tier names
                    rankNumeric: player.trophies || null,
                    meta: {
                        highestTrophies: player.highestTrophies,
                        expLevel: player.expLevel,
                        soloVictories: player.soloVictories,
                        duoVictories: player.duoVictories,
                        trioVictories: player["3vs3Victories"],
                    },
                },
            });
        }
    } catch (err) {
        console.error(`Failed to fetch rank for ${account.game} account ${account.id}:`, err);
    }

    // Fetch raw logs
    if ((account.game as any) === "CLASH_ROYALE") {
        matches = await fetchClashRoyaleBattleLog(account.externalId);
    } else if ((account.game as any) === "BRAWL_STARS") {
        const res = await fetchBrawlStarsBattleLog(account.externalId);
        matches = res.items ?? [];
    }

    let inserted = 0;

    // Process matches (Newest first usually, but we upsert by ID)
    for (const m of matches) {
        // Generate a deterministic ID based on time + type
        const matchDate = new Date(m.battleTime.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2}).*$/, '$1-$2-$3T$4:$5:$6.000Z'));
        const matchId = `sc_${account.game}_${m.battleTime}_${account.externalId}`; // Basic ID, collisions rare for same user same second

        // Check if exists
        const exists = await prisma.match.findUnique({ where: { matchId } } as any);
        if (exists) continue;

        // Normalize
        let stats: any = {};
        let result: "WIN" | "LOSS" | "DRAW" = "DRAW";
        let duration = 180; // default 3 mins

        if ((account.game as any) === "CLASH_ROYALE") {
            const team = m.team[0];
            const opponent = m.opponent[0];
            const myCrowns = team.crowns ?? 0;
            const oppCrowns = opponent.crowns ?? 0;

            if (myCrowns > oppCrowns) result = "WIN";
            else if (myCrowns < oppCrowns) result = "LOSS";
            else result = "DRAW";

            // Proxy Stats for Universal Domains
            stats = {
                crowns: myCrowns,
                opponentCrowns: oppCrowns,
                // Proxies for FPS-centric scoring:
                kills: myCrowns * 5, // Crowns are "kills"
                deaths: oppCrowns * 5,
                objectiveTimeSeconds: myCrowns > 0 ? 100 : 0,
                damageDealt: (team.kingTowerHitPoints ? (1000 - team.kingTowerHitPoints) : 0) + (myCrowns * 1000), // very rough
            };
        } else {
            // Brawl Stars normalization (basic)
            result = m.battle.result === "victory" ? "WIN" : "LOSS";
            stats = {
                mode: m.battle.mode,
                rank: m.battle.rank,
                trophyChange: m.battle.trophyChange,
                // Brawl stars doesn't expose K/D in battle log easily without advanced parsing
                kills: m.battle.result === "victory" ? 10 : 2,
                deaths: m.battle.result === "victory" ? 2 : 10,
            };
            duration = m.battle.duration ?? 120;
        }

        await prisma.match.create({
            data: {
                matchId,
                userId: account.userId,
                gameAccountId: account.id,
                game: account.game as any,
                mode: "RANKED", // assume ranked for simplicity
                startedAt: matchDate,
                endedAt: new Date(matchDate.getTime() + duration * 1000),
                durationSeconds: duration,
                result: result as any,
                normalizedStats: stats,
                source: "SUPERCELL_API" as any,
                ingestedAt: new Date(),
            }
        });
        inserted++;
    }

    return { inserted };
}
