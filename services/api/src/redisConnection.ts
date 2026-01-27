import IORedis from "ioredis";

/**
 * Create an IORedis connection from a Redis URL.
 *
 * Now that the URL uses rediss:// (TLS), ioredis handles everything
 * natively. We only add maxRetriesPerRequest (BullMQ requirement).
 *
 * IMPORTANT: Use rediss:// (not redis://) for Upstash.
 */
export function createRedisConnection(url: string): IORedis {
  return new IORedis(url, {
    maxRetriesPerRequest: null,
  });
}
