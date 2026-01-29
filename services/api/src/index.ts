import dns from "node:dns";

// Force IPv4-first DNS resolution – Render's infrastructure sometimes refuses
// IPv6 connections to external APIs (Steam, MarvelRivalsAPI, etc.), causing
// AggregateError [ECONNREFUSED]. This mirrors the earlier Redis IPv4 fix.
dns.setDefaultResultOrder("ipv4first");

import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import rawBody from "fastify-raw-body";
import rateLimit from "@fastify/rate-limit";
import { env } from "./env";
import { authPlugin } from "./auth/middleware";

import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { linkRoutes } from "./routes/link";
import { ingestRoutes } from "./routes/ingest";
import { dashboardRoutes } from "./routes/dashboard";
import { questRoutes } from "./routes/quests";
import { rewardRoutes } from "./routes/rewards";
import { billingRoutes } from "./routes/billing";
import { webhookRoutes } from "./routes/webhooks";
import { pushRoutes } from "./routes/push";
import { sessionRoutes } from "./routes/sessions";
import { startFallbackScheduler } from "./scheduler";

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "development" ? "info" : "info",
  },
});

await app.register(cors, {
  origin: (origin, cb) => {
    // allow no-origin (mobile) and localhost origins by default in dev.
    if (!origin) return cb(null, true);
    const ok =
      origin.startsWith("http://localhost:") ||
      origin.startsWith("https://localhost:") ||
      origin === env.WEB_BASE_URL;
    cb(null, ok);
  },
  credentials: true,
});

await app.register(cookie, {
  secret: env.JWT_SECRET,
});

await app.register(formbody);

await app.register(rawBody, {
  field: "rawBody",
  global: false,
  encoding: "utf8",
  runFirst: true,
});

await app.register(authPlugin);

// Rate limiting - prevents abuse
await app.register(rateLimit, {
  max: 100, // 100 requests per minute globally
  timeWindow: "1 minute",
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).userId;
    return userId || req.ip;
  },
});

// Routes
await app.register(healthRoutes);
await app.register(authRoutes, { prefix: "/auth" });
await app.register(meRoutes, { prefix: "/me" });
await app.register(linkRoutes, { prefix: "/link" });
await app.register(ingestRoutes, { prefix: "/ingest" });
await app.register(dashboardRoutes, { prefix: "/dashboard" });
await app.register(questRoutes, { prefix: "/quests" });
await app.register(rewardRoutes, { prefix: "/rewards" });
await app.register(billingRoutes, { prefix: "/billing" });
await app.register(webhookRoutes, { prefix: "/webhooks" });
await app.register(pushRoutes, { prefix: "/push" });
await app.register(sessionRoutes, { prefix: "/session-insights" });

app.setErrorHandler((err, req, reply) => {
  const status = (err as any).statusCode ?? 500;
  req.log.error({ err }, "request error");
  reply.status(status).send({
    error: status === 500 ? "Internal Server Error" : err.message,
  });
});

await app.listen({ port: env.API_PORT, host: "0.0.0.0" });

app.log.info(`API listening on ${env.API_BASE_URL}`);

// Start background scheduler (uses BullMQ if Redis available, else in-process fallback)
startFallbackScheduler();
