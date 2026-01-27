import IORedis from "ioredis";

/**
 * Create an IORedis connection from a Redis URL.
 * Let ioredis handle URL parsing (including rediss:// TLS detection).
 * We only add options that BullMQ requires or that fix cloud hosting issues.
 */
export function createRedisConnection(url: string): IORedis {
  return new IORedis(url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    family: 4, // Force IPv4 — prevents ECONNRESET on hosts with broken IPv6
  });
}
