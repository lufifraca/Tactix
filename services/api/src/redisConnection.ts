import IORedis from "ioredis";

/**
 * Create an IORedis connection by manually parsing the URL.
 * This avoids ioredis URL parsing issues with rediss:// TLS endpoints.
 */
export function createRedisConnection(url: string): IORedis {
  const parsed = new URL(url);
  const useTls = parsed.protocol === "rediss:";

  return new IORedis({
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    username: parsed.username || "default",
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    tls: useTls ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
    family: 4, // Force IPv4 — Upstash IPv6 causes ECONNRESET on some hosts
  });
}
