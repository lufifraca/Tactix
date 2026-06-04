import { redis } from "../queue";

/**
 * Brute-force throttling for login. Backed by Redis when available (survives
 * across instances/restarts), with an in-memory fallback for local dev.
 */

// ── Login throttle ───────────────────────────────────────────────────────────
const LOGIN_WINDOW_S = 15 * 60; // 15 minutes
const LOGIN_MAX_FAILS = 8;

const failMem = new Map<string, { count: number; resetAt: number }>();

/** Returns null if allowed, or seconds-to-wait if the key is currently locked out. */
export async function loginRetryAfter(key: string): Promise<number | null> {
  if (redis) {
    const k = `login_fail:${key}`;
    const n = Number((await redis.get(k)) ?? 0);
    if (n >= LOGIN_MAX_FAILS) {
      const ttl = await redis.ttl(k);
      return ttl > 0 ? ttl : LOGIN_WINDOW_S;
    }
    return null;
  }
  const e = failMem.get(key);
  if (e && e.count >= LOGIN_MAX_FAILS && Date.now() < e.resetAt) {
    return Math.ceil((e.resetAt - Date.now()) / 1000);
  }
  return null;
}

export async function recordLoginFailure(key: string): Promise<void> {
  if (redis) {
    const k = `login_fail:${key}`;
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, LOGIN_WINDOW_S);
    return;
  }
  const now = Date.now();
  const e = failMem.get(key);
  if (!e || now >= e.resetAt) failMem.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_S * 1000 });
  else e.count++;
}

export async function clearLoginFailures(key: string): Promise<void> {
  if (redis) {
    await redis.del(`login_fail:${key}`);
    return;
  }
  failMem.delete(key);
}
