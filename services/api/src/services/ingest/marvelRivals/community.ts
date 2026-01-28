import { env } from "../../../env";
import { fetchJson, fetchWithRetries } from "../../../utils/http";

export type MarvelMatchHistoryV2 = {
  match_history: any[];
  pagination?: { has_more?: boolean; page?: number; total_pages?: number };
};

export async function fetchMarvelMatchHistoryCommunity(params: {
  query: string; // username or uid
  gameMode?: string;
  page?: number;
  limit?: number;
}): Promise<MarvelMatchHistoryV2> {
  if (!env.MARVEL_RIVALS_API_KEY) {
    throw new Error("MARVEL_RIVALS_API_KEY not configured. Get a free key at https://marvelrivalsapi.com");
  }

  const base = env.MARVEL_RIVALS_API_BASE ?? "https://marvelrivalsapi.com/api/v2";
  const url = new URL(`${base.replace(/\/$/, "")}/player/${encodeURIComponent(params.query)}/match-history`);
  if (params.gameMode) url.searchParams.set("game_mode", params.gameMode);
  url.searchParams.set("page", String(params.page ?? 1));
  url.searchParams.set("limit", String(params.limit ?? 40));

  const headers: Record<string, string> = {
    "x-api-key": env.MARVEL_RIVALS_API_KEY,
  };

  return fetchWithRetries(() => fetchJson<MarvelMatchHistoryV2>(url.toString(), { headers }));
}

/**
 * Fetch player profile (includes current rank tier).
 * Tries v2 first, then falls back to v1 (v1 is confirmed to have rank data).
 */
export async function fetchMarvelPlayerProfile(username: string): Promise<any> {
  if (!env.MARVEL_RIVALS_API_KEY) return null;

  const headers = { "x-api-key": env.MARVEL_RIVALS_API_KEY };
  const encoded = encodeURIComponent(username);

  // Try v2 first
  try {
    const v2 = await fetchJson<any>(`https://marvelrivalsapi.com/api/v2/player/${encoded}`, { headers });
    if (v2 && Object.keys(v2).length > 0) return v2;
  } catch {
    // v2 failed, try v1
  }

  // Fall back to v1 (confirmed to have rank.rank, info.rank_game_season)
  try {
    return await fetchJson<any>(`https://marvelrivalsapi.com/api/v1/player/${encoded}`, { headers });
  } catch (e) {
    console.error("[Marvel Rivals] Player profile fetch failed on both v2 and v1:", e);
    return null;
  }
}

/**
 * Extract player UID from profile data.
 * The UID is more reliable for match history queries than username.
 */
export async function fetchMarvelPlayerUid(username: string): Promise<string | null> {
  try {
    const profile = await fetchMarvelPlayerProfile(username);
    // The UID is typically in profile.player.uid or profile.uid
    const uid = profile?.player?.uid ?? profile?.uid ?? profile?.info?.uid;
    if (uid) {
      console.log(`[Marvel Rivals] Resolved UID for ${username}: ${uid}`);
      return String(uid);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch match history with retry logic.
 * Tries username first, then UID if username returns no results.
 */
export async function fetchMarvelMatchHistoryWithRetry(params: {
  username: string;
  uid?: string | null;
  gameMode?: string;
  page?: number;
  limit?: number;
}): Promise<{ matches: any[]; queryUsed: string }> {
  const { username, uid, gameMode, page = 1, limit = 40 } = params;

  // Strategy 1: Try with username
  console.log(`[Marvel Rivals] Fetching match history for username: ${username}`);
  try {
    const result = await fetchMarvelMatchHistoryCommunity({ query: username, gameMode, page, limit });
    if (result.match_history && result.match_history.length > 0) {
      console.log(`[Marvel Rivals] Found ${result.match_history.length} matches via username`);
      return { matches: result.match_history, queryUsed: username };
    }
  } catch (e) {
    console.warn(`[Marvel Rivals] Username query failed:`, e);
  }

  // Strategy 2: Try with UID (if we have it or can fetch it)
  let playerUid = uid;
  if (!playerUid) {
    console.log(`[Marvel Rivals] Username returned 0 matches, attempting to resolve UID...`);
    playerUid = await fetchMarvelPlayerUid(username);
  }

  if (playerUid && playerUid !== username) {
    console.log(`[Marvel Rivals] Retrying with UID: ${playerUid}`);
    try {
      const result = await fetchMarvelMatchHistoryCommunity({ query: playerUid, gameMode, page, limit });
      if (result.match_history && result.match_history.length > 0) {
        console.log(`[Marvel Rivals] Found ${result.match_history.length} matches via UID`);
        return { matches: result.match_history, queryUsed: playerUid };
      }
    } catch (e) {
      console.warn(`[Marvel Rivals] UID query failed:`, e);
    }
  }

  // Strategy 3: Try without any game mode filter (in case filter is causing issues)
  if (gameMode) {
    console.log(`[Marvel Rivals] Retrying without game mode filter...`);
    try {
      const result = await fetchMarvelMatchHistoryCommunity({ query: playerUid ?? username, page, limit });
      if (result.match_history && result.match_history.length > 0) {
        console.log(`[Marvel Rivals] Found ${result.match_history.length} matches without game mode filter`);
        return { matches: result.match_history, queryUsed: playerUid ?? username };
      }
    } catch (e) {
      console.warn(`[Marvel Rivals] No-filter query failed:`, e);
    }
  }

  console.log(`[Marvel Rivals] All strategies exhausted, returning empty matches`);
  return { matches: [], queryUsed: username };
}
