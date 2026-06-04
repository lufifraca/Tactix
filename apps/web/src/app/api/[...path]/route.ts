import { NextRequest } from "next/server";

// Node serverless runtime so we can extend maxDuration past the Edge 30s cap.
// Render's free tier cold-starts can take ~30-60s; Edge would time out (the
// dreaded FUNCTION_INVOCATION_TIMEOUT). 60s is the Vercel Hobby max (Vercel
// caps to the plan limit automatically if it's lower).
export const runtime = "nodejs";
export const maxDuration = 60;

const API_ORIGIN = "https://tactix-6jc8.onrender.com";

// Abort just under the function budget so a still-cold backend returns a clean
// "waking up" message instead of a raw platform timeout.
const UPSTREAM_TIMEOUT_MS = 55_000;

// Gateway errors mean the request never reached the app (Render is cold-starting
// or restarting), so they're safe to retry — even for non-GET methods.
const GATEWAY_ERRORS = new Set([502, 503, 504]);
const RETRY_DELAY_MS = 4_000;

const wakingResponse = () =>
  new Response(
    JSON.stringify({
      error: "backend_waking",
      message: "The server is waking up — please retry in a few seconds.",
    }),
    { status: 503, headers: { "content-type": "application/json" } }
  );

async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const backendPath = pathname.replace(/^\/api/, "");
  const url = `${API_ORIGIN}${backendPath}${search}`;

  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    let upstream: Response | null = null;

    // Retry gateway errors (cold start) until the app responds or we run out of
    // budget (the abort signal caps total time).
    for (;;) {
      upstream = await fetch(url, { ...init, signal: ctrl.signal });
      if (!GATEWAY_ERRORS.has(upstream.status)) break;
      await upstream.arrayBuffer().catch(() => {}); // drain before retrying
      if (ctrl.signal.aborted) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      if (ctrl.signal.aborted) break;
    }

    if (GATEWAY_ERRORS.has(upstream.status)) {
      clearTimeout(timer);
      return wakingResponse();
    }

    // Buffer the body rather than streaming `upstream.body`. Streaming a web
    // ReadableStream through a Node serverless function is fragile on Vercel and
    // can surface as a client-side "Failed to fetch". API responses are small
    // JSON, so reading them in full is cheap and reliable.
    const body = await upstream.arrayBuffer();
    clearTimeout(timer);

    const resHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      // Drop headers that no longer match the re-emitted body / are hop-by-hop.
      if (k === "content-encoding" || k === "content-length" || k === "transfer-encoding" || k === "connection") {
        return;
      }
      resHeaders.append(key, value);
    });

    return new Response(body, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === "AbortError";
    if (aborted) return wakingResponse();
    const message = err instanceof Error ? err.message : "Unknown proxy error";
    return new Response(JSON.stringify({ error: "proxy_error", message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
