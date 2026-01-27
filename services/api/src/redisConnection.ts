import IORedis from "ioredis";

/**
 * Create an IORedis connection from a Redis URL.
 *
 * Key constraints:
 * - Passing an options object as the 2nd arg to new IORedis(url, opts)
 *   can interfere with ioredis's internal URL/TLS parsing.
 * - BullMQ requires maxRetriesPerRequest = null.
 * - We need family:4 to force IPv4 on Render (IPv6 causes ECONNRESET).
 *
 * Solution: parse the URL ourselves into an options-only constructor call
 * so there's no ambiguity between URL string + options merging.
 */
export function createRedisConnection(url: string): IORedis {
  const parsed = new URL(url);
  const useTls = parsed.protocol === "rediss:";

  const opts: any = {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 6379,
    maxRetriesPerRequest: null,
    family: 4,
  };

  if (parsed.username) {
    opts.username = parsed.username; // new URL() already decodes
  }
  if (parsed.password) {
    opts.password = parsed.password; // new URL() already decodes percent-encoding
  }
  if (useTls) {
    opts.tls = {};
  }

  return new IORedis(opts);
}
