import { env } from "../../../env";
import { fetchJson, fetchWithRetries } from "../../../utils/http";

/**
 * Henrik's unofficial Valorant API
 * Docs: https://docs.henrikdev.xyz
 *
 * This provides match history, MMR, and account data without
 * needing Riot's production API approval.
 */

const BASE = "https://api.henrikdev.xyz";

// Henrik API region slugs
export type HenrikRegion = "eu" | "na" | "ap" | "kr";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (env.HENRIK_API_KEY) {
    headers["Authorization"] = env.HENRIK_API_KEY;
  }
  return headers;
}

// ─── Response types ──────────────────────────────────────────────────

export interface HenrikAccount {
  puuid: string;
  region: string;
  account_level: number;
  name: string;
  tag: string;
  card: {
    small: string;
    large: string;
    wide: string;
    id: string;
  };
  last_update: string;
  last_update_raw: number;
}

export interface HenrikMmr {
  currenttier: number;
  currenttierpatched: string; // e.g. "Diamond 2"
  ranking_in_tier: number; // RR (0-100)
  mmr_change_to_last_game: number;
  elo: number;
  name: string;
  tag: string;
  old: boolean;
}

export interface HenrikMatchPlayer {
  puuid: string;
  name: string;
  tag: string;
  team: string; // "Red" | "Blue"
  level: number;
  character: string; // agent name
  currenttier: number;
  currenttier_patched: string;
  player_card: string;
  player_title: string;
  party_id: string;
  session_playtime: { minutes: number; seconds: number; milliseconds: number };
  behavior: { afk_rounds: number; friendly_fire: { incoming: number; outgoing: number }; rounds_in_spawn: number };
  platform: { type: string; os: { name: string; version: string } };
  ability_casts: {
    c_cast: number;
    q_cast: number;
    e_cast: number;
    x_cast: number;
  };
  assets: {
    card: { small: string; large: string; wide: string };
    agent: { small: string; full: string; bust: string; killfeed: string };
  };
  stats: {
    score: number;
    kills: number;
    deaths: number;
    assists: number;
    bodyshots: number;
    headshots: number;
    legshots: number;
  };
  economy: {
    spent: { overall: number; average: number };
    loadout_value: { overall: number; average: number };
  };
  damage_made: number;
  damage_received: number;
}

export interface HenrikMatchTeam {
  has_won: boolean;
  rounds_won: number;
  rounds_lost: number;
}

export interface HenrikMatch {
  metadata: {
    map: string;
    game_version: string;
    game_length: number; // seconds
    game_start: number; // unix timestamp
    game_start_patched: string;
    rounds_played: number;
    mode: string; // "Competitive", "Unrated", "Deathmatch", etc.
    mode_id: string;
    queue: string;
    season_id: string;
    platform: string;
    matchid: string;
    premier_info?: { tournament_id: string; matchup_id: string };
    region: string;
    cluster: string;
  };
  players: {
    all_players: HenrikMatchPlayer[];
    red: HenrikMatchPlayer[];
    blue: HenrikMatchPlayer[];
  };
  teams: {
    red: HenrikMatchTeam;
    blue: HenrikMatchTeam;
  };
  rounds: any[];
  kills: any[];
}

export interface HenrikLifetimeMatch {
  meta: {
    id: string;
    map: { id: string; name: string };
    version: string;
    mode: string;
    started_at: string;
    season: { id: string; short: string };
    region: string;
    cluster: string;
  };
  stats: {
    puuid: string;
    team: string;
    level: number;
    character: { id: string; name: string };
    tier: number;
    score: number;
    kills: number;
    deaths: number;
    assists: number;
    shots: { head: number; body: number; leg: number };
    damage: { made: number; received: number };
  };
  teams: {
    red: number; // rounds won
    blue: number;
  };
}

// ─── API functions ───────────────────────────────────────────────────

/**
 * Get account info by name/tag
 */
export async function henrikGetAccount(
  name: string,
  tag: string
): Promise<HenrikAccount> {
  const url = `${BASE}/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const resp = await fetchWithRetries(() =>
    fetchJson<{ status: number; data: HenrikAccount }>(url, { headers: getHeaders() })
  );
  return resp.data;
}

/**
 * Get current MMR/rank data
 */
export async function henrikGetMmr(
  region: HenrikRegion,
  name: string,
  tag: string
): Promise<HenrikMmr> {
  const url = `${BASE}/valorant/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const resp = await fetchWithRetries(() =>
    fetchJson<{ status: number; data: HenrikMmr }>(url, { headers: getHeaders() })
  );
  return resp.data;
}

/**
 * Get last matches (v3 returns full match details, up to 5 per call)
 */
export async function henrikGetMatches(
  region: HenrikRegion,
  name: string,
  tag: string,
  mode?: "competitive" | "unrated" | "deathmatch" | "spikerush" | "swiftplay"
): Promise<HenrikMatch[]> {
  let url = `${BASE}/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  if (mode) url += `?mode=${mode}`;
  const resp = await fetchWithRetries(() =>
    fetchJson<{ status: number; data: HenrikMatch[] }>(url, { headers: getHeaders() })
  );
  return resp.data;
}

/**
 * Get lifetime match history (paginated, up to 20 per page)
 * This returns summarized match data, not full details
 */
export async function henrikGetLifetimeMatches(
  region: HenrikRegion,
  name: string,
  tag: string,
  opts: { page?: number; size?: number; mode?: string } = {}
): Promise<HenrikLifetimeMatch[]> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.size) params.set("size", String(opts.size));
  if (opts.mode) params.set("mode", opts.mode);

  const qs = params.toString();
  const url = `${BASE}/valorant/v1/lifetime/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}${qs ? `?${qs}` : ""}`;
  const resp = await fetchWithRetries(() =>
    fetchJson<{ status: number; data: HenrikLifetimeMatch[] }>(url, { headers: getHeaders() })
  );
  return resp.data;
}
