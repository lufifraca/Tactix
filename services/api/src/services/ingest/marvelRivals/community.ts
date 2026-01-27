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
