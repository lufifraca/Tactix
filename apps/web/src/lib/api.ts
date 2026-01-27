import { DashboardResponse } from "@tactix/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function getDashboard(mode: "ALL" | "RANKED" | "UNRANKED" = "ALL") {
  return apiGet<DashboardResponse>(`/dashboard?mode=${mode}`);
}

export function authUrl(provider: "google" | "discord") {
  const redirect = encodeURIComponent(`${window.location.origin}/dashboard`);
  return `${API_BASE}/auth/${provider}/start?redirect=${redirect}`;
}

export function steamLinkUrl() {
  const redirect = encodeURIComponent(`${window.location.origin}/dashboard/settings`);
  return `${API_BASE}/auth/steam/start?redirect=${redirect}`;
}

export async function getRankHistory(game: string, limit = 30) {
  return apiGet<{ game: string; history: { rankTier: string | null; rankNumeric: number | null; capturedAt: string }[] }>(
    `/dashboard/rank-history/${encodeURIComponent(game)}?limit=${limit}`
  );
}

export interface CharacterStatClient {
  character: string;
  game: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKills: number | null;
  avgDeaths: number | null;
  avgAssists: number | null;
}

export async function getCharacterBreakdown(game?: string) {
  const params = game ? `?game=${encodeURIComponent(game)}` : "";
  return apiGet<{ characters: CharacterStatClient[]; totalGames: number }>(
    `/dashboard/character-breakdown${params}`
  );
}
