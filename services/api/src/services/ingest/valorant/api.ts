import { env } from "../../../env";
import { fetchJson, fetchWithRetries } from "../../../utils/http";

/**
 * Riot Games API client for Valorant
 * Docs: https://developer.riotgames.com/apis
 *
 * Regional routing:
 * - AMERICAS: NA, BR, LATAM
 * - EUROPE: EU, TR, RU
 * - ASIA: KR, AP
 *
 * Account API uses regional routing (americas, europe, asia)
 * Match API uses shard (na, eu, ap, kr, br, latam)
 */

// Regions for ACCOUNT-V1 API
export type AccountRegion = "americas" | "europe" | "asia";

// Shards for VAL-MATCH-V1 API
export type ValShard = "na" | "eu" | "ap" | "kr" | "br" | "latam";

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface ValMatchInfo {
  matchId: string;
  mapId: string;
  gameLengthMillis: number;
  gameStartMillis: number;
  provisioningFlowId: string;
  isCompleted: boolean;
  customGameName: string;
  queueId: string;
  gameMode: string;
  isRanked: boolean;
  seasonId: string;
}

export interface ValPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  teamId: string;
  partyId: string;
  characterId: string;
  stats: {
    score: number;
    roundsPlayed: number;
    kills: number;
    deaths: number;
    assists: number;
    playtimeMillis: number;
    abilityCasts?: {
      grenadeCasts: number;
      ability1Casts: number;
      ability2Casts: number;
      ultimateCasts: number;
    };
  };
  competitiveTier: number;
  playerCard: string;
  playerTitle: string;
}

export interface ValTeam {
  teamId: string;
  won: boolean;
  roundsPlayed: number;
  roundsWon: number;
  numPoints: number;
}

export interface ValMatch {
  matchInfo: ValMatchInfo;
  players: ValPlayer[];
  teams: ValTeam[];
}

export interface ValMatchHistory {
  puuid: string;
  history: Array<{
    matchId: string;
    gameStartTimeMillis: number;
    queueId: string;
  }>;
}

function getApiKey(): string {
  if (!env.RIOT_API_KEY) {
    throw new Error("RIOT_API_KEY not configured");
  }
  return env.RIOT_API_KEY;
}

/**
 * Get Riot Account by Riot ID (gameName#tagLine)
 * Uses ACCOUNT-V1 API
 */
export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  region: AccountRegion = "americas"
): Promise<RiotAccount> {
  const apiKey = getApiKey();
  const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

  const data = await fetchWithRetries(() =>
    fetchJson<RiotAccount>(url, {
      headers: { "X-Riot-Token": apiKey },
    })
  );

  return data;
}

/**
 * Get Riot Account by PUUID
 */
export async function getAccountByPuuid(
  puuid: string,
  region: AccountRegion = "americas"
): Promise<RiotAccount> {
  const apiKey = getApiKey();
  const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;

  const data = await fetchWithRetries(() =>
    fetchJson<RiotAccount>(url, {
      headers: { "X-Riot-Token": apiKey },
    })
  );

  return data;
}

/**
 * Get Valorant match history for a player
 */
export async function getValMatchHistory(
  puuid: string,
  shard: ValShard = "na"
): Promise<ValMatchHistory> {
  const apiKey = getApiKey();
  const url = `https://${shard}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${puuid}`;

  const data = await fetchWithRetries(() =>
    fetchJson<ValMatchHistory>(url, {
      headers: { "X-Riot-Token": apiKey },
    })
  );

  return data;
}

/**
 * Get Valorant match details
 */
export async function getValMatch(
  matchId: string,
  shard: ValShard = "na"
): Promise<ValMatch> {
  const apiKey = getApiKey();
  const url = `https://${shard}.api.riotgames.com/val/match/v1/matches/${matchId}`;

  const data = await fetchWithRetries(() =>
    fetchJson<ValMatch>(url, {
      headers: { "X-Riot-Token": apiKey },
    })
  );

  return data;
}

/**
 * Validate a Riot ID exists and return account info.
 * Uses Henrik's API (no expiring key) with Riot API as fallback.
 */
export async function validateRiotId(
  riotId: string, // Format: "GameName#TagLine"
  region: AccountRegion = "americas"
): Promise<RiotAccount> {
  const parts = riotId.split("#");
  if (parts.length !== 2) {
    throw new Error("Invalid Riot ID format. Use: Name#Tag");
  }

  const [gameName, tagLine] = parts;
  if (!gameName || !tagLine) {
    throw new Error("Invalid Riot ID format. Use: Name#Tag");
  }

  const name = gameName.trim();
  const tag = tagLine.trim();

  // Prefer Henrik API (doesn't require a production Riot key)
  if (env.HENRIK_API_KEY) {
    try {
      const { henrikGetAccount } = await import("./henrikApi");
      const account = await henrikGetAccount(name, tag);
      return { puuid: account.puuid, gameName: account.name, tagLine: account.tag };
    } catch (e: any) {
      // If Henrik fails with 404, surface it clearly
      if (e.message?.includes("404") || e.message?.includes("not found")) {
        throw new Error("Riot ID not found. Please check your Name#Tag and try again.");
      }
      // For other Henrik errors, fall through to Riot API
    }
  }

  return getAccountByRiotId(name, tag, region);
}
