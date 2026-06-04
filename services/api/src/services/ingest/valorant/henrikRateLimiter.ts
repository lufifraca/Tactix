import { env } from "../../../env";

/**
 * Henrik's free/basic API tier allows roughly 30 requests/minute. As more users
 * sync (and especially when the worker polls every account on a schedule), the
 * per-refresh calls (account + mmr + matches + lifetime pages) can blow past
 * that and start returning 429s.
 *
 * This serializes Henrik calls and spaces them out so we never exceed the
 * configured rate, regardless of how many accounts ingest concurrently. It
 * reserves evenly-spaced time slots, so N concurrent callers queue politely
 * instead of bursting.
 *
 * NOTE: in-process only (per API / worker process). For multi-instance deploys
 * a shared Redis token bucket would be the next step.
 */
const perMin = Number(env.HENRIK_RATE_LIMIT_PER_MIN) || 30;
const MIN_INTERVAL_MS = Math.ceil(60_000 / Math.max(1, perMin));

let nextSlot = 0;

export async function throttleHenrik<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_INTERVAL_MS;
  const wait = start - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return fn();
}
