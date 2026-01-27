import type { GameAccount } from "@prisma/client";
import { type GameProvider } from "../../../constants";
import { prisma } from "../../../prisma";
import { putObject } from "../../storage";
import { extractErrorMessage } from "../../../utils/http";
import { sha256Hex } from "../../../utils/crypto";
import { fetchMarvelMatchHistoryCommunity, fetchMarvelPlayerProfile } from "./community";
import { fetchMarvelProfileTrackerNetwork } from "./trackerNetwork";
import { normalizeMarvelMatchFromCommunity, normalizeMarvelMatchFromTRN } from "./normalize";
import { saveRankSnapshot } from "../rankTracking";

const MARVEL_RANK_LEVELS: Record<number, string> = {
  1: "Bronze III", 2: "Bronze II", 3: "Bronze I",
  4: "Silver III", 5: "Silver II", 6: "Silver I",
  7: "Gold III", 8: "Gold II", 9: "Gold I",
  10: "Platinum III", 11: "Platinum II", 12: "Platinum I",
  13: "Diamond III", 14: "Diamond II", 15: "Diamond I",
  16: "Grandmaster III", 17: "Grandmaster II", 18: "Grandmaster I",
  19: "Celestial III", 20: "Celestial II", 21: "Celestial I",
  22: "Eternity", 23: "One Above All",
};

function marvelRankFromLevel(level: number): string | null {
  return MARVEL_RANK_LEVELS[level] ?? null;
}

export async function ingestMarvelRivalsAccount(account: GameAccount): Promise<{ inserted: number; sourceUsed: GameProvider }> {
  const [platform, username] = account.externalId.includes(":")
    ? account.externalId.split(":", 2)
    : [account.platform ?? "pc", account.externalId];

  const preference = (account.meta as any)?.providerPreference ?? "TRACKER_NETWORK";

  // Primary: Tracker Network (if key works). Fallback: MarvelRivalsAPI.com match history.
  let sourceUsed: GameProvider = "COMMUNITY";
  let matches: any[] = [];
  let rawPayloadS3Key: string | null = null;
  let rawPayloadSha256: string | null = null;

  if (preference === "TRACKER_NETWORK") {
    try {
      const trn = await fetchMarvelProfileTrackerNetwork({ platform, username });
      // TRN response doesn't have a stable match history schema across titles; store raw and fall back if no match array.
      const trnBody = JSON.stringify(trn);
      const trnSha = sha256Hex(trnBody);
      const trnKey = `raw/marvel_rivals/trn/${account.userId}/${Date.now()}_${trnSha.slice(0, 10)}.json`;
      await putObject({ key: trnKey, body: trnBody, contentType: "application/json", cacheControl: "private, max-age=0" });
      rawPayloadS3Key = trnKey;
      rawPayloadSha256 = trnSha;
      sourceUsed = "TRACKER_NETWORK";

      // Try to locate matches in a few common places.
      const maybe = (trn?.data?.matches ?? trn?.data?.matchHistory ?? trn?.matches ?? []) as any[];
      if (Array.isArray(maybe) && maybe.length > 0) {
        matches = maybe;
        sourceUsed = "TRACKER_NETWORK";
      }
    } catch (e) {
      // fall back
      console.error("TRN fetch failed, falling back to community API", e);
      sourceUsed = "COMMUNITY";
    }
  }

  if (matches.length === 0) {
    const mh = await fetchMarvelMatchHistoryCommunity({ query: username, page: 1, limit: 40 });
    matches = mh.match_history ?? [];
    sourceUsed = "COMMUNITY";

    const body = JSON.stringify(mh);
    const sha = sha256Hex(body);
    const rawKey = `raw/marvel_rivals/community/${account.userId}/${Date.now()}_${sha.slice(0, 10)}.json`;
    await putObject({ key: rawKey, body, contentType: "application/json", cacheControl: "private, max-age=0" });
    rawPayloadS3Key = rawKey;
    rawPayloadSha256 = sha;
  }

  let inserted = 0;
  let matchErrors = 0;

  console.log(`[Marvel Rivals] Processing ${matches.length} matches for account ${account.id} (source: ${sourceUsed})`);

  for (const m of matches) {
    try {
      const norm = sourceUsed === "TRACKER_NETWORK"
        ? normalizeMarvelMatchFromTRN(m)
        : normalizeMarvelMatchFromCommunity(m);

      if (!norm.matchId) continue;

      // Use findFirst for robustness (works even without compound unique index)
      const existed = await prisma.match.findFirst({
        where: { game: "MARVEL_RIVALS", matchId: norm.matchId },
        select: { id: true },
      });
      if (existed) continue;

      // Validate dates before insert (Invalid Date causes Prisma errors)
      const endedAt = norm.endedAt instanceof Date && !isNaN(norm.endedAt.getTime()) ? norm.endedAt : undefined;
      const startedAt = norm.startedAt instanceof Date && !isNaN(norm.startedAt.getTime()) ? norm.startedAt : undefined;

      await prisma.match.create({
        data: {
          userId: account.userId,
          gameAccountId: account.id,
          game: "MARVEL_RIVALS",
          matchId: norm.matchId,
          startedAt,
          endedAt,
          mode: norm.mode,
          map: norm.map ?? undefined,
          result: norm.result,
          durationSeconds: norm.durationSeconds ?? undefined,
          normalizedStats: norm.normalizedStats as any,
          rawPayloadS3Key: rawPayloadS3Key ?? undefined,
          rawPayloadSha256: rawPayloadSha256 ?? undefined,
          source: sourceUsed,
        },
      });
      inserted += 1;
    } catch (matchErr: any) {
      matchErrors += 1;
      console.error(`[Marvel Rivals] Failed to insert match (uid: ${m?.match_uid ?? "?"}):`, extractErrorMessage(matchErr));
      // Continue processing remaining matches instead of failing the entire ingest
    }
  }

  if (matchErrors > 0) {
    console.warn(`[Marvel Rivals] ${matchErrors}/${matches.length} matches failed to insert, ${inserted} succeeded`);
  }

  // Extract rank from player profile + most recent ranked match
  try {
    let profileRankTier: string | null = null;
    let profileRankScore: number | null = null;
    let profileRankImage: string | null = null;
    let profileRankColor: string | null = null;
    try {
      const rawProfile = await fetchMarvelPlayerProfile(username);
      const profile = rawProfile?.player ?? rawProfile;
      if (profile) {
        // The API's rank.rank field is broken (returns "Invalid level"),
        // so we derive the tier name from rank_game_season.level instead.
        const seasons = profile.info?.rank_game_season;
        if (seasons && typeof seasons === "object") {
          const entries = Object.values(seasons) as any[];
          const latest = entries.sort((a: any, b: any) => (b.update_time ?? 0) - (a.update_time ?? 0))[0];
          if (latest) {
            profileRankTier = marvelRankFromLevel(latest.level);
            if (latest.rank_score != null) {
              profileRankScore = latest.rank_score;
            }
          }
        }

        // Fall back to rank.rank only if it's not the broken "Invalid level"
        if (!profileRankTier) {
          const apiRank = profile.rank?.rank;
          if (apiRank && typeof apiRank === "string" && !apiRank.toLowerCase().includes("invalid")) {
            profileRankTier = apiRank;
          }
        }

        profileRankImage = profile.rank?.image ?? null;
        profileRankColor = profile.rank?.color ?? null;

        console.log("[Marvel Rivals] Extracted rank:", { profileRankTier, profileRankScore });
      }
    } catch (profileErr) {
      console.error("[Marvel Rivals] Profile fetch failed (non-blocking):", profileErr);
    }

    // Also extract MMR from most recent ranked match
    let matchScore: number | null = null;
    let matchScoreChange: number | undefined;
    let matchTimestamp: number | undefined;

    if (matches.length > 0 && sourceUsed === "COMMUNITY") {
      const rankedMatch = matches.find((m: any) => {
        const mp = m.match_player ?? {};
        return mp.score_info?.new_score != null;
      });

      if (rankedMatch) {
        const scoreInfo = rankedMatch.match_player?.score_info;
        matchScore = scoreInfo?.new_score ?? null;
        matchScoreChange = scoreInfo?.add_score;
        matchTimestamp = rankedMatch.match_time_stamp;
      }
    }

    const finalScore = profileRankScore ?? matchScore;
    if (profileRankTier || finalScore != null) {
      await saveRankSnapshot({
        userId: account.userId,
        gameAccountId: account.id,
        game: "MARVEL_RIVALS",
        source: sourceUsed,
        rankData: {
          rankTier: profileRankTier,
          rankNumeric: finalScore,
          mode: "RANKED",
          meta: {
            scoreChange: matchScoreChange,
            matchTimestamp,
            rankImage: profileRankImage,
            rankColor: profileRankColor,
          },
        },
      });
    }
  } catch (err) {
    console.error(`Failed to save rank snapshot for Marvel Rivals account ${account.id}:`, err);
  }

  return { inserted, sourceUsed };
}
