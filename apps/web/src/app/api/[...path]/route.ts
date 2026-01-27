import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = "https://tactix-6jc8.onrender.com";

async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Strip leading /api to get the backend path
  const backendPath = pathname.replace(/^\/api/, "");
  const url = `${API_ORIGIN}${backendPath}${search}`;

  const headers = new Headers();
  // Forward cookie header so the backend can read the session
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  // Forward content-type for POST/PUT bodies
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const init: RequestInit = {
    method: req.method,
    headers,
    // Don't follow redirects — pass them back to the browser with Set-Cookie intact
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(url, init);

  // Build the response, forwarding all headers from the backend
  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    // Forward every header; NextResponse handles multiple Set-Cookie correctly
    resHeaders.append(key, value);
  });

  // For redirects, return them as-is so the browser handles Set-Cookie + Location
  if (upstream.status >= 300 && upstream.status < 400) {
    return new NextResponse(null, {
      status: upstream.status,
      headers: resHeaders,
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
