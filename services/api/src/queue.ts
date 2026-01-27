import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

let redis: IORedis | null = null;
let ingestQueue: Queue | null = null;
let computeQueue: Queue | null = null;

// Initialize Redis – connect directly and let ioredis handle retries
(async () => {
  try {
    const useTls = env.REDIS_URL.startsWith("rediss://");
    redis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      ...(useTls ? { tls: {} } : {}),
      lazyConnect: true,
    });

    redis.on("error", () => {
      // Suppress repeated connection errors in the log
    });

    await redis.connect();

    ingestQueue = new Queue("ingest", { connection: redis as any });
    computeQueue = new Queue("compute", { connection: redis as any });
    console.log("[Queue] Redis connected");
  } catch (err: any) {
    console.warn("[Queue] Redis unavailable – queue jobs will be skipped:", err.message);
    redis = null;
  }
})();

/**
 * Safely add a job to the ingest queue. No-op if Redis is unavailable.
 */
async function safeEnqueueIngest(name: string, data: IngestJob, opts?: any): Promise<void> {
  if (!ingestQueue) return;
  try {
    await ingestQueue.add(name, data, opts);
  } catch (err: any) {
    console.warn("[Queue] Failed to enqueue ingest job:", err.message);
  }
}

/**
 * Safely add a job to the compute queue. No-op if Redis is unavailable.
 */
async function safeEnqueueCompute(name: string, data: ComputeJob, opts?: any): Promise<void> {
  if (!computeQueue) return;
  try {
    await computeQueue.add(name, data, opts);
  } catch (err: any) {
    console.warn("[Queue] Failed to enqueue compute job:", err.message);
  }
}

export { redis, ingestQueue, computeQueue, safeEnqueueIngest, safeEnqueueCompute };

export type IngestJob =
  | { type: "INGEST_ACCOUNT"; gameAccountId: string }
  | { type: "INGEST_USER_ALL"; userId: string };

export type ComputeJob =
  | { type: "GENERATE_DAILY"; userId: string; date: string }
  | { type: "RECOMPUTE_SKILLS"; userId: string }
  | { type: "RECOMPUTE_QUESTS"; userId: string; date: string }
  | { type: "TRIGGER_DAILY" }
  | { type: "TRIGGER_STREAK" }
  | { type: "TRIGGER_WEEKLY" }
  | { type: "TRIGGER_POLL" };
