/**
 * Lightweight in-process scheduler.
 *
 * When Redis + the BullMQ worker process are running, *they* own the schedule
 * (see worker.ts). This module provides a fallback that runs inside the API
 * process so auto-refresh works even without Redis.
 *
 * It starts automatically on import and prints which mode is active.
 */

import { redis } from "./queue";
import { prisma } from "./prisma";
import { ingestUserAll } from "./services/ingest/ingestOrchestrator";

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the fallback scheduler if Redis is not available.
 * Called once from index.ts after the server boots.
 */
export function startFallbackScheduler() {
  // Run the periodic poll IN-PROCESS. The separate BullMQ worker isn't deployed
  // (single Render service), so deferring to it when Redis is present would mean
  // nothing runs the schedule at all. Polling in-process keeps the every-30-min
  // refresh working on a single instance, with or without Redis.
  //
  // NOTE: if a dedicated worker process is ever deployed, gate this off so the
  // poll doesn't run in both places (which would double-ingest).
  console.log(
    redis
      ? "[Scheduler] Running in-process auto-refresh every 30 min (no separate worker deployed)."
      : "[Scheduler] Redis unavailable — running in-process auto-refresh every 30 min."
  );

  // Initial poll 60s after startup (let the server warm up)
  setTimeout(() => runPoll(), 60_000);

  timer = setInterval(() => runPoll(), POLL_INTERVAL_MS);
}

async function runPoll() {
  try {
    const users = await prisma.user.findMany({
      where: { gameAccounts: { some: {} } },
      select: { id: true },
    });

    console.log(`[Scheduler] Auto-refresh: ingesting for ${users.length} user(s)…`);

    for (const u of users) {
      try {
        const result = await ingestUserAll(u.id);
        const inserted = (result as any)?.results?.reduce((s: number, r: any) => s + (r?.inserted ?? 0), 0) ?? 0;
        if (inserted > 0) {
          console.log(`[Scheduler] User ${u.id}: ingested ${inserted} new match(es).`);
        }
      } catch (err: any) {
        console.warn(`[Scheduler] Ingest failed for user ${u.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error("[Scheduler] Poll error:", err.message);
  }
}

export function stopFallbackScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
