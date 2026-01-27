import { NextRequest } from "next/server";

// Edge Runtime: 30 s timeout (vs 10 s for serverless on Hobby plan)
export const runtime = "edge";

const API_ORIGIN = "https://tactix-6jc8.onrender.com";

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

  try {
    const upstream = await fetch(url, init);

    const resHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      resHeaders.append(key, value);
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown proxy error";
    return new Response(JSON.stringify({ error: "proxy_error", message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
