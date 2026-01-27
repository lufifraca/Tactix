import { NextRequest, NextResponse } from "next/server";

/**
 * Auth callback handler — sets the session cookie on the Vercel domain.
 *
 * The backend OAuth callbacks redirect here with ?token=JWT&redirect=/dashboard
 * instead of setting Set-Cookie themselves. This guarantees the cookie is set
 * on the correct domain regardless of how GOOGLE_REDIRECT_URI is configured,
 * and avoids Render cold-start timeouts breaking the cookie flow.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
  }

  // Redirect to the target page and set the session cookie
  const target = new URL(redirect, req.url);
  const res = NextResponse.redirect(target);

  res.cookies.set("tx_session", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
