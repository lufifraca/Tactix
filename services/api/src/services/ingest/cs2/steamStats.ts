import { env } from "../../../env";
import { fetchJson, fetchWithRetries } from "../../../utils/http";

export type SteamUserStatsForGameResponse = {
  playerstats?: {
    steamID?: string;
    gameName?: string;
    stats?: { name: string; value: number }[];
    achievements?: any[];
  };
};

export async function fetchCs2CumulativeStats(steamid: string): Promise<SteamUserStatsForGameResponse> {
  if (!env.STEAM_WEB_API_KEY) throw new Error("STEAM_WEB_API_KEY not configured");

  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/");
  url.searchParams.set("key", env.STEAM_WEB_API_KEY);
  url.searchParams.set("steamid", steamid);
  url.searchParams.set("appid", "730");

  console.log("CS2 stats URL:", url.toString().replace(env.STEAM_WEB_API_KEY!, "<redacted>"));

  return fetchWithRetries(() => fetchJson<SteamUserStatsForGameResponse>(url.toString()), { retries: 1 });
}

export function statsArrayToMap(stats: { name: string; value: number }[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of stats ?? []) {
    if (typeof s?.name === "string" && typeof s?.value === "number") out[s.name] = s.value;
  }
  return out;
}

export function mapCs2CumulativeToCanonical(cum: Record<string, number>) {
  const get = (k: string) => (typeof cum[k] === "number" ? cum[k] : 0);

  return {
    kills: get("total_kills"),
    deaths: get("total_deaths"),
    assists: get("total_assists"),
    headshots: get("total_kills_headshot"),
    plants: get("total_planted_bombs") || get("total_bombs_planted"),
    defuses: get("total_defused_bombs") || get("total_bombs_defused"),
    mvp: get("total_mvps"),
    // Not always present; keep optional signals in extra.
    extra: {
      totalWins: get("total_wins"),
      totalMatchesPlayed: get("total_matches_played"),
      totalShotsFired: get("total_shots_fired"),
      totalShotsHit: get("total_shots_hit"),
      totalDamageDone: get("total_damage_done"),
      totalDamageTaken: get("total_damage_taken"),
    },
  };
}

export function diffCanonical(now: any, prev: any) {
  const keys = ["kills", "deaths", "assists", "headshots", "plants", "defuses", "mvp"] as const;
  const delta: any = {};
  for (const k of keys) {
    const a = typeof now?.[k] === "number" ? now[k] : 0;
    const b = typeof prev?.[k] === "number" ? prev[k] : 0;
    delta[k] = Math.max(0, a - b);
  }

  // Include damage deltas if available in extra
  const extraKeys = ["totalDamageDone", "totalDamageTaken", "totalMatchesPlayed", "totalShotsFired", "totalShotsHit"] as const;
  delta.extra = {};
  for (const k of extraKeys) {
    const a = typeof now?.extra?.[k] === "number" ? now.extra[k] : 0;
    const b = typeof prev?.extra?.[k] === "number" ? prev.extra[k] : 0;
    delta.extra[k] = Math.max(0, a - b);
  }

  // Map some extras into canonical-ish fields if possible.
  if (typeof delta.extra.totalDamageDone === "number") delta.damageDealt = delta.extra.totalDamageDone;
  if (typeof delta.extra.totalDamageTaken === "number") delta.damageTaken = delta.extra.totalDamageTaken;

  // Synthetic duration: not available from Steam cumulative stats
  delta.matchDurationSeconds = undefined;

  return delta;
}
