/**
 * Extract a meaningful error message from any error type.
 * Handles AggregateError (empty .message, errors in .errors array),
 * plain strings, and standard Error objects.
 */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;

  const e = err as any;

  // AggregateError (e.g. ECONNREFUSED from Node.js fetch) has empty .message
  // but useful info in .errors array and .code
  if (e.name === "AggregateError" || e.constructor?.name === "AggregateError") {
    const code = e.code ?? e.errors?.[0]?.code ?? "";
    const inner = e.errors?.[0]?.message ?? "";
    return `${e.name}: ${code}${inner ? ` (${inner})` : ""}`.trim() || "Connection error";
  }

  if (e.message) return e.message;
  return String(err);
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 15_000, ...rest } = init as any;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal } as any);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err: any = new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
      err.statusCode = res.status;
      throw err;
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchWithRetries<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 400;

  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (i === retries) break;
      const delay = baseDelayMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
