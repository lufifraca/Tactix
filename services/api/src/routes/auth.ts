import type { FastifyInstance } from "fastify";
import openid from "openid";
import { z } from "zod";
import { env } from "../env";
import { prisma } from "../prisma";
import { signSessionToken, signState, verifyState } from "../auth/jwt";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { fetchJson, fetchWithRetries } from "../utils/http";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  loginRetryAfter,
  recordLoginFailure,
  clearLoginFailures,
} from "../auth/authSecurity";

function setSessionCookie(reply: any, token: string) {
  reply.setCookie("tx_session", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function buildRedirectUrl(base: string, params: Record<string, string>) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

/**
 * Redirect through the Vercel-hosted /auth/callback route so the session
 * cookie is set on the frontend domain. This avoids the cookie being set
 * on the Render domain (wrong origin) and eliminates dependence on the
 * proxy forwarding Set-Cookie headers.
 */
function buildSessionRedirect(token: string, targetUrl: string): string {
  // Mobile deep links bypass the cookie flow
  if (targetUrl.startsWith(`${env.MOBILE_DEEPLINK_SCHEME}://`)) {
    return buildRedirectUrl(targetUrl, { token });
  }

  // Web: redirect through /auth/callback on the frontend domain
  const cb = new URL(`${env.WEB_BASE_URL}/auth/callback`);
  cb.searchParams.set("token", token);
  try {
    const parsed = new URL(targetUrl);
    cb.searchParams.set("redirect", parsed.pathname + parsed.search);
  } catch {
    cb.searchParams.set("redirect", "/dashboard");
  }
  return cb.toString();
}

async function upsertUserFromIdentity(opts: {
  provider: "GOOGLE" | "DISCORD";
  providerUserId: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  rawProfile: any;
}) {
  const existing = await prisma.identity.findUnique({
    where: { provider_providerUserId: { provider: opts.provider, providerUserId: opts.providerUserId } },
    include: { user: true },
  });

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.userId },
      data: {
        email: existing.user.email ?? opts.email ?? undefined,
        displayName: opts.displayName ?? existing.user.displayName ?? undefined,
        avatarUrl: opts.avatarUrl ?? existing.user.avatarUrl ?? undefined,
      },
    });

    await prisma.identity.update({
      where: { id: existing.id },
      data: {
        email: opts.email ?? undefined,
        displayName: opts.displayName ?? undefined,
        avatarUrl: opts.avatarUrl ?? undefined,
        rawProfile: opts.rawProfile,
      },
    });

    return user;
  }

  // Try attach to user by email first (nice UX).
  let user = opts.email ? await prisma.user.findUnique({ where: { email: opts.email } }) : null;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: opts.email ?? null,
        displayName: opts.displayName ?? null,
        avatarUrl: opts.avatarUrl ?? null,
      },
    });
  }

  await prisma.identity.create({
    data: {
      userId: user.id,
      provider: opts.provider,
      providerUserId: opts.providerUserId,
      email: opts.email ?? null,
      displayName: opts.displayName ?? null,
      avatarUrl: opts.avatarUrl ?? null,
      rawProfile: opts.rawProfile,
    },
  });

  return user;
}

export async function authRoutes(app: FastifyInstance) {
  // --- Dev-only quick login (no OAuth) ---
  // Visit http://localhost:3001/auth/dev-login (optionally ?email=you@example.com)
  // to upsert a user, set the session cookie, and bounce to the dashboard.
  // Hard-disabled in production so it can never be an auth bypass in prod.
  app.get("/dev-login", async (req, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.code(404).send({ error: "Not found" });
    }
    const q = req.query as any;
    const email = (typeof q.email === "string" && q.email.trim()) || "dev@tactix.local";

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, displayName: "Dev User" } });
    }

    const token = signSessionToken(user.id);
    setSessionCookie(reply, token);

    const redirect = (typeof q.redirect === "string" && q.redirect) || `${env.WEB_BASE_URL}/dashboard`;
    return reply.redirect(redirect);
  });

  // --- Email / password (no OAuth required) ---
  function publicUser(u: { id: string; email: string | null; displayName: string | null; avatarUrl: string | null }) {
    return { id: u.id, email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl };
  }

  // POST /auth/register  { email, password, displayName? }
  app.post("/register", async (req, reply) => {
    const Body = z.object({
      email: z.string().email().transform((e) => e.trim().toLowerCase()),
      password: z.string().min(8, "Password must be at least 8 characters").max(200),
      displayName: z.string().trim().min(1).max(80).optional(),
    });
    const parsed = Body.safeParse((req as any).body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { email, password, displayName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Don't silently hijack an OAuth account that has no password set.
      return reply.code(409).send({ error: "An account with this email already exists. Try signing in." });
    }

    const user = await prisma.user.create({
      data: {
        email,
        displayName: displayName ?? email.split("@")[0],
        passwordHash: hashPassword(password),
      },
    });

    const token = signSessionToken(user.id);
    setSessionCookie(reply, token);
    return reply.code(201).send({ ok: true, user: publicUser(user) });
  });

  // POST /auth/login  { email, password }
  app.post("/login", async (req, reply) => {
    const Body = z.object({
      email: z.string().email().transform((e) => e.trim().toLowerCase()),
      password: z.string().min(1).max(200),
    });
    const parsed = Body.safeParse((req as any).body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid email or password" });
    }
    const { email, password } = parsed.data;

    // Brute-force throttle (per client IP).
    const throttleKey = req.ip;
    const retryAfter = await loginRetryAfter(throttleKey);
    if (retryAfter != null) {
      reply.header("Retry-After", String(retryAfter));
      return reply.code(429).send({
        error: `Too many sign-in attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.passwordHash) {
      // Account exists but was created via an OAuth provider — guide the user there.
      return reply.code(403).send({
        error: "This email is registered with Google or Discord. Please sign in with that provider.",
      });
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      await recordLoginFailure(throttleKey);
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    await clearLoginFailures(throttleKey);
    const token = signSessionToken(user.id);
    setSessionCookie(reply, token);
    return reply.send({ ok: true, user: publicUser(user) });
  });

  // --- Google ---
  app.get("/google/start", async (req, reply) => {
    const redirect = (req.query as any)?.redirect as string | undefined;
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
      reply.code(500).send({ error: "Google OAuth not configured" });
      return;
    }

    const state = signState({ p: "google", r: redirect ?? `${env.WEB_BASE_URL}/dashboard` }, 10);

    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    u.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("state", state);
    u.searchParams.set("prompt", "select_account");
    reply.redirect(u.toString());
  });

  app.get("/google/callback", async (req, reply) => {
    const q = req.query as any;
    const code = q.code as string | undefined;
    const state = q.state as string | undefined;
    if (!code || !state) return reply.code(400).send({ error: "Missing code/state" });

    const st = verifyState(state);
    if (!st || st.p !== "google") return reply.code(400).send({ error: "Invalid state" });

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      return reply.code(500).send({ error: "Google OAuth not configured" });
    }

    const tokenRes = await fetchWithRetries(() =>
      fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: env.GOOGLE_REDIRECT_URI!,
          grant_type: "authorization_code",
          code,
        }),
      }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j));
        return j as any;
      })
    );

    const idToken = tokenRes.id_token as string | undefined;
    if (!idToken) return reply.code(400).send({ error: "Missing id_token" });

    // Verify id_token via Google tokeninfo (fast + simple for v1).
    const info = await fetchJson<any>(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    const user = await upsertUserFromIdentity({
      provider: "GOOGLE",
      providerUserId: info.sub,
      email: info.email,
      displayName: info.name,
      avatarUrl: info.picture,
      rawProfile: info,
    });

    const sessionToken = signSessionToken(user.id);
    setSessionCookie(reply, sessionToken); // fallback for direct backend access / dev

    const redirectTo = typeof st.r === "string" ? st.r : `${env.WEB_BASE_URL}/dashboard`;
    return reply.redirect(buildSessionRedirect(sessionToken, redirectTo));
  });

  // --- Discord ---
  app.get("/discord/start", async (req, reply) => {
    const redirect = (req.query as any)?.redirect as string | undefined;
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_REDIRECT_URI) {
      reply.code(500).send({ error: "Discord OAuth not configured" });
      return;
    }

    const state = signState({ p: "discord", r: redirect ?? `${env.WEB_BASE_URL}/dashboard` }, 10);

    const u = new URL("https://discord.com/api/oauth2/authorize");
    u.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
    u.searchParams.set("redirect_uri", env.DISCORD_REDIRECT_URI);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "identify email");
    u.searchParams.set("state", state);
    reply.redirect(u.toString());
  });

  app.get("/discord/callback", async (req, reply) => {
    const q = req.query as any;
    const code = q.code as string | undefined;
    const state = q.state as string | undefined;
    if (!code || !state) return reply.code(400).send({ error: "Missing code/state" });

    const st = verifyState(state);
    if (!st || st.p !== "discord") return reply.code(400).send({ error: "Invalid state" });

    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_REDIRECT_URI) {
      return reply.code(500).send({ error: "Discord OAuth not configured" });
    }

    const tokenRes = await fetchWithRetries(() =>
      fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID!,
          client_secret: env.DISCORD_CLIENT_SECRET!,
          redirect_uri: env.DISCORD_REDIRECT_URI!,
          grant_type: "authorization_code",
          code,
        }),
      }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j));
        return j as any;
      })
    );

    const accessToken = tokenRes.access_token as string;

    const profile = await fetchWithRetries(() =>
      fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j));
        return j as any;
      })
    );

    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null;

    const user = await upsertUserFromIdentity({
      provider: "DISCORD",
      providerUserId: profile.id,
      email: profile.email,
      displayName: profile.global_name ?? profile.username,
      avatarUrl,
      rawProfile: profile,
    });

    const sessionToken = signSessionToken(user.id);
    setSessionCookie(reply, sessionToken); // fallback for direct backend access / dev

    const redirectTo = typeof st.r === "string" ? st.r : `${env.WEB_BASE_URL}/dashboard`;
    return reply.redirect(buildSessionRedirect(sessionToken, redirectTo));
  });

  // --- Steam (linking only) ---
  const relyingParty = new openid.RelyingParty(
    env.STEAM_RETURN_TO || "http://localhost:3001/auth/steam/callback",
    env.STEAM_REALM || "http://localhost:3001",
    true,
    false,
    []
  );

  app.get("/steam/start", async (req: AuthedRequest, reply) => {
    const user = await requireUser(req);
    const redirect = (req.query as any)?.redirect as string | undefined;
    const state = signState({ p: "steam", uid: user.id, r: redirect ?? `${env.WEB_BASE_URL}/settings` }, 10);

    await new Promise<void>((resolve, reject) => {
      relyingParty.authenticate("https://steamcommunity.com/openid", false, (err: any, authUrl: any) => {
        if (err || !authUrl) return reject(err ?? new Error("No authUrl"));

        // Steam doesn't preserve arbitrary query params well, so include our state in return_to.
        const u = new URL(authUrl);
        const returnTo = u.searchParams.get("openid.return_to");
        if (returnTo) {
          const rt = new URL(returnTo);
          rt.searchParams.set("state", state);
          u.searchParams.set("openid.return_to", rt.toString());
        }

        reply.redirect(u.toString());
        resolve();
      });
    });
  });

  app.get("/steam/callback", async (req, reply) => {
    const q = req.query as any;
    const state = q.state as string | undefined;
    if (!state) return reply.code(400).send({ error: "Missing state" });

    const st = verifyState(state);
    if (!st || st.p !== "steam" || typeof st.uid !== "string") {
      return reply.code(400).send({ error: "Invalid state" });
    }

    const userId = st.uid as string;

    // Steam includes query params in openid.return_to; openid library validates exact match.
    const steamReturnTo = q["openid.return_to"] as string | undefined;

    const rp = new openid.RelyingParty(
      steamReturnTo || (env.STEAM_RETURN_TO || "http://localhost:3001/auth/steam/callback"),
      env.STEAM_REALM || "http://localhost:3001",
      true,
      false,
      []
    );

    const assertion = await new Promise<{ claimedIdentifier?: string }>((resolve, reject) => {
      rp.verifyAssertion(req.raw as any, (err: any, result: any) => {
        if (err) return reject(err);
        resolve(result ?? {});
      });
    });

    const claimed = assertion.claimedIdentifier;
    const match = claimed?.match(/\/openid\/id\/(\d+)/);
    const steamid = match?.[1];
    if (!steamid) return reply.code(400).send({ error: "Unable to extract SteamID" });

    await prisma.identity.upsert({
      where: { provider_providerUserId: { provider: "STEAM", providerUserId: steamid } },
      update: { userId, rawProfile: { steamid } },
      create: { userId, provider: "STEAM", providerUserId: steamid, rawProfile: { steamid } },
    });

    await prisma.gameAccount.upsert({
      where: { game_provider_externalId: { game: "CS2", provider: "STEAM", externalId: steamid } },
      update: { userId },
      create: {
        userId,
        game: "CS2",
        provider: "STEAM",
        externalId: steamid,
        displayName: `Steam ${steamid}`,
      },
    });

    const redirectTo = typeof st.r === "string" ? st.r : `${env.WEB_BASE_URL}/settings`;
    return reply.redirect(redirectTo);
  });

  // Session info (for debugging)
  app.get("/session", async (req: AuthedRequest) => {
    if (!req.userId) return { authenticated: false };
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return { authenticated: false };
    return {
      authenticated: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
    };
  });

  app.get("/logout", async (_req, reply) => {
    reply.clearCookie("tx_session", { path: "/" });
    return { ok: true };
  });
}

