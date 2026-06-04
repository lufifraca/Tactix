import { DashboardResponse } from "@tactix/shared";

// Prefer the explicit env var. If it's missing/empty, fall back to the
// same-origin "/api" proxy in the browser (prod) — never to localhost, which
// would fail on a deployed site ("Failed to fetch"). Local dev still uses the
// API on :3001 when the env var is unset.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "/api"
    : "http://localhost:3001");

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

export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
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

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/** Create an account with email + password. Sets the session cookie on success. */
export async function registerWithPassword(email: string, password: string, displayName?: string) {
  return apiPost<{ ok: boolean; user: AuthUser }>("/auth/register", { email, password, displayName });
}

/** Sign in with email + password. Sets the session cookie on success. */
export async function loginWithPassword(email: string, password: string) {
  return apiPost<{ ok: boolean; user: AuthUser }>("/auth/login", { email, password });
}

export function authUrl(provider: "google" | "discord") {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const redirect = encodeURIComponent(`${origin}/dashboard`);
  return `${API_BASE}/auth/${provider}/start?redirect=${redirect}`;
}

export function steamLinkUrl() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const redirect = encodeURIComponent(`${origin}/dashboard/settings`);
  return `${API_BASE}/auth/steam/start?redirect=${redirect}`;
}

/** Dev-only one-click login. Points at the API's dev-login route (port 3001),
 *  which is disabled in production. */
export function devLoginUrl(redirectPath = "/dashboard") {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const redirect = encodeURIComponent(`${origin}${redirectPath}`);
  return `${API_BASE}/auth/dev-login?redirect=${redirect}`;
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
