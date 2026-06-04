import { prisma } from "../../prisma";
import { env } from "../../env";
import { extractErrorMessage } from "../../utils/http";
import { ingestMarvelRivalsAccount } from "./marvelRivals/index.js";

// How long to wait before re-fetching a user's Steam library (6 hours).
const STEAM_LIBRARY_TTL_SECONDS = 6 * 60 * 60;

// Cap stored matches per account so history doesn't grow unbounded. We keep the
// most-recent N (analytics/coaching only care about recent form anyway).
const MATCH_LIMIT_PER_ACCOUNT = Number(env.MATCH_LIMIT_PER_ACCOUNT) || 100;

/** Delete all but the most-recent `keep` matches for an account. */
export async function pruneAccountMatches(gameAccountId: string, keep = MATCH_LIMIT_PER_ACCOUNT) {
  const stale = await prisma.match.findMany({
    where: { gameAccountId },
    orderBy: [{ startedAt: { sort: "desc", nulls: "last" } }, { ingestedAt: "desc" }],
    select: { id: true },
    skip: keep, // everything past the most-recent `keep`
  });
  if (stale.length) {
    await prisma.match.deleteMany({ where: { id: { in: stale.map((m) => m.id) } } });
  }
  return stale.length;
}

/** Drop today's cached AI coach so it regenerates from fresh data. */
function invalidateCoachReport(userId: string) {
  const date = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  return prisma.coachReport.deleteMany({ where: { userId, date } });
}

/** Ingest an account, trim its history to the cap, and refresh the coach if new matches landed. */
export async function ingestGameAccount(gameAccountId: string) {
  const result = await ingestGameAccountInner(gameAccountId);
  try {
    const pruned = await pruneAccountMatches(gameAccountId);
    if (pruned > 0) console.log(`[Ingest] Pruned ${pruned} old matches for account ${gameAccountId} (cap ${MATCH_LIMIT_PER_ACCOUNT})`);
  } catch (e) {
    console.warn(`[Ingest] Prune failed for ${gameAccountId}:`, (e as any)?.message ?? e);
  }
  // New matches → invalidate today's cached coach so it regenerates next view.
  try {
    if ((result as any)?.inserted > 0) {
      const acct = await prisma.gameAccount.findUnique({ where: { id: gameAccountId }, select: { userId: true } });
      if (acct) await invalidateCoachReport(acct.userId);
    }
  } catch (e) {
    console.warn(`[Ingest] Coach invalidate failed for ${gameAccountId}:`, (e as any)?.message ?? e);
  }
  return result;
}

async function ingestGameAccountInner(gameAccountId: string) {
  const account = await prisma.gameAccount.findUnique({ where: { id: gameAccountId } });
  if (!account) return { ok: false, error: "Account not found" };

  // Generic Provider Handling
  if (account.provider === "STEAM" && account.externalId) {
    try {
      // The Steam library rarely changes and the API is rate-limited, so we
      // throttle re-fetches to at most once per STEAM_LIBRARY_TTL_SECONDS using
      // a short-lived Redis lock. (Previously this ran on every account touch.)
      const { redis } = await import("../../queue");
      let shouldFetch = true;
      if (redis) {
        // SET NX returns null when the key already exists (i.e. fetched recently).
        const acquired = await redis.set(
          `steam_library_lock:${account.userId}`,
          "1",
          "EX",
          STEAM_LIBRARY_TTL_SECONDS,
          "NX"
        );
        shouldFetch = acquired === "OK";
      }

      if (shouldFetch) {
        const { fetchSteamLibrary } = await import("./steam/library");
        const { putObject } = await import("../storage");

        const games = await fetchSteamLibrary(account.externalId);
        const body = JSON.stringify({ games, date: new Date().toISOString() });
        const key = `raw/steam_library/${account.userId}/${Date.now()}.json`;

        await putObject({ key, body, contentType: "application/json", cacheControl: "private, max-age=0" });

        // Also cache the latest snapshot in Redis (fallback when S3 isn't configured).
        try {
          if (redis) {
            await redis.set(`steam_library:${account.userId}`, body, "EX", 86400 * 7);
          }
        } catch (_) { /* non-fatal */ }

        console.log(`Ingested Steam Lib for ${account.userId}: ${games.length} games`);
      } else {
        console.log(`[Ingest] Skipping Steam library for ${account.userId} (fetched recently)`);
      }
    } catch (e) {
      console.error("Failed to ingest Steam library", e);
      // Don't fail the specific game ingest just because library failed
    }
  }

  // CS2 is no longer tracked - skip data fetching entirely
  if (account.game === "CS2") {
    console.log(`[Ingest] Skipping CS2 account ${account.id} - CS2 tracking disabled`);
    return { ok: true, inserted: 0, game: "CS2", skipped: true };
  }

  if (account.game === "MARVEL_RIVALS") {
    const res = await ingestMarvelRivalsAccount(account);
    return { ok: true, inserted: res.inserted, game: "MARVEL_RIVALS", sourceUsed: res.sourceUsed };
  }

  if ((account.provider as any) === "SUPERCELL" || account.game === "CLASH_ROYALE" || account.game === "BRAWL_STARS") {
    console.log(`[Ingest] Processing Supercell account: ${account.game}/${account.provider}/${account.displayName}`);
    const { ingestSupercellAccount } = await import("./supercell/ingest");
    const res = await ingestSupercellAccount(account);
    console.log(`[Ingest] Supercell result for ${account.game}: inserted=${res.inserted}`);
    return { ok: true, inserted: res.inserted, game: account.game };
  }

  if (account.game === "VALORANT") {
    const { ingestValorantAccount } = await import("./valorant/ingest");
    const res = await ingestValorantAccount(account);
    return {
      ok: true,
      inserted: res.inserted,
      game: "VALORANT",
      note: res.matchHistoryError || undefined,
    };
  }

  return { ok: false, error: "Unsupported game" };
}

export async function ingestUserAll(userId: string) {
  const accounts = await prisma.gameAccount.findMany({ where: { userId } });
  console.log(`[Ingest] Found ${accounts.length} accounts for user ${userId}:`, accounts.map(a => `${a.game}/${a.provider}/${a.displayName}`));
  const results = [];
  for (const a of accounts) {
    try {
      results.push(await ingestGameAccount(a.id));
    } catch (err: any) {
      const errorMsg = extractErrorMessage(err);
      console.error(`[Ingest] Error ingesting account ${a.id} (${a.game}):`, errorMsg, err?.stack ?? err);
      results.push({ ok: false, error: errorMsg, game: a.game });
    }
  }
  return { ok: true, results };
}
