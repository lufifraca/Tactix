import IORedis from "ioredis";

/**
 * Create an IORedis connection from a Redis URL.
 *
 * - Uses options-only constructor to avoid URL+options merge issues.
 * - Auto-enables TLS for rediss:// URLs AND known cloud hosts (Upstash).
 * - BullMQ requires maxRetriesPerRequest = null.
 */
export function createRedisConnection(url: string): IORedis {
  const parsed = new URL(url);

  // Enable TLS if the protocol says so OR if it's a known cloud Redis host
  const isCloudRedis = parsed.hostname.includes("upstash.io");
  const useTls = parsed.protocol === "rediss:" || isCloudRedis;

  if (isCloudRedis && parsed.protocol !== "rediss:") {
    console.warn("[Redis] Upstash host detected with redis:// — auto-enabling TLS. Consider using rediss:// in your REDIS_URL.");
  }

  const opts: any = {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    maxRetriesPerRequest: null,
    connectTimeout: 30000,
    keepAlive: 10000,
  };

  if (parsed.username) {
    opts.username = parsed.username;
  }
  if (parsed.password) {
    opts.password = parsed.password;
  }
  if (useTls) {
    opts.tls = {};
  }

  return new IORedis(opts);
}
