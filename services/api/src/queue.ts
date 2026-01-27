import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";
import net from "net";

let redis: IORedis | null = null;
let ingestQueue: Queue | null = null;
let computeQueue: Queue | null = null;

// Parse Redis URL to get host/port for a quick probe
function parseRedisUrl(url: string): { host: string; port: number } {
  try {
    const u = new URL(url);
    return { host: u.hostname || "127.0.0.1", port: parseInt(u.port) || 6379 };
  } catch {
    return { host: "127.0.0.1", port: 6379 };
  }
}

// Quick TCP probe to check if Redis is reachable before creating connections
function probePort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const timer = setTimeout(() => { sock.destroy(); resolve(false); }, timeoutMs);
    sock.once("connect", () => { clearTimeout(timer); sock.destroy(); resolve(true); });
    sock.once("error", () => { clearTimeout(timer); sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

// Initialize Redis asynchronously – only create connections if Redis is reachable
(async () => {
  const { host, port } = parseRedisUrl(env.REDIS_URL);
  const reachable = await probePort(host, port);

  if (!reachable) {
    console.warn(`[Queue] Redis not reachable at ${host}:${port} – queue jobs will be skipped.`);
    return;
  }

  try {
    const useTls = env.REDIS_URL.startsWith("rediss://");
    redis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      ...(useTls ? { tls: {} } : {}),
    });

    redis.on("error", () => {
      // Suppress repeated connection errors in the log
    });

    ingestQueue = new Queue("ingest", { connection: redis as any });
    computeQueue = new Queue("compute", { connection: redis as any });
    console.log("[Queue] Redis connected");
  } catch (err: any) {
    console.warn("[Queue] Failed to initialize Redis/BullMQ:", err.message);
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
