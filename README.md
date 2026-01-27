# tactix v1 — Cross-Game Tactical FPS Quest + Rewards Platform

This repo is a **full v1 implementation** of the spec you provided:
- **Games**: CS2 + Marvel Rivals
- **Daily coach dashboard** with **verifiable-stat quests** and **cross-game skill domains**
- **Private-by-default rewards** (badge + share card), deterministic SVG → PNG rendering
- **Subscription** via Stripe ($7.99/mo) (optional in local dev)
- **Background polling** every 30 minutes via a worker process (BullMQ + Redis)

> UI is intentionally minimal. Everything is wired end-to-end and designed to be iterated.

---

## Monorepo layout

- `packages/shared` — shared TypeScript schemas/types (Zod) used by API + web + mobile
- `services/api` — Fastify API + Prisma/Postgres + BullMQ/Redis + S3 storage + rewards rendering
- `apps/web` — Next.js web app (coach dashboard)
- `apps/mobile` — Expo React Native app (minimal)

---

## Local dev quickstart

### 1) Start infra (Postgres + Redis + MinIO)

```bash
pnpm docker:up
```

MinIO console: http://localhost:9001  
MinIO credentials: `minio / minio_password`

### 2) Install deps

```bash
pnpm install
```

### 3) Configure env

Copy `.env.example` → `.env` at repo root and fill required values.

Minimum for local testing (no OAuth):
- `JWT_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `S3_*`

For real auth:
- Google OAuth + Discord OAuth
- Steam OpenID (Steam doesn't require client secret)
- `STEAM_WEB_API_KEY` for CS2 cumulative stats

Marvel Rivals match history:
- `MARVEL_RIVALS_API_BASE` + `MARVEL_RIVALS_API_KEY` (community API)
- Optional `TRN_API_KEY` if you have Tracker Network access

### 4) Run migrations

```bash
pnpm --filter @tactix/api db:generate
pnpm --filter @tactix/api db:migrate
```

### 5) Run API + Worker

Terminal A (API):
```bash
pnpm --filter @tactix/api dev
```

Terminal B (Worker / polling):
```bash
pnpm --filter @tactix/api worker:dev
```

API health: http://localhost:3001/health

### 6) Run web

```bash
pnpm --filter @tactix/web dev
```

Web: http://localhost:3000

---

## How v1 handles ingestion

### Marvel Rivals
- **Primary:** Tracker Network (if available via `TRN_API_KEY`)
- **Fallback:** Community API (`MARVEL_RIVALS_API_BASE`, default points to `marvelrivalsapi.com`)

The ingest logic:
- Fetches **match history**
- Normalizes each match into canonical stats
- Stores match rows + raw payload snapshots (S3)

### CS2
CS2 match-level APIs are not reliably available without additional infrastructure.
So **v1 ingests deterministic cumulative stats** via Steam Web API:
- Fetch cumulative stats from `ISteamUserStats/GetUserStatsForGame` (appid 730)
- Store as `StatSnapshot`
- Compute a **delta** vs the previous snapshot and store it as a synthetic "match-like" row
  - This makes daily quest scoring deterministic and reprocessable.

You can later swap the CS2 ingest module to true match-level parsing (share codes + GC) without changing the quest/skill system.

---

## Determinism / Trust

- Quest completion is computed **purely from stored normalized stats** (and/or stored snapshots transformed into deltas).
- Raw payload snapshots are written to S3 so you can reprocess.
- Rewards are rendered deterministically (SVG → PNG); no NFTs.

---

## Stripe subscription

Endpoints:
- `POST /billing/checkout` — returns Stripe Checkout URL
- `POST /billing/portal` — returns Stripe customer portal URL
- `POST /webhooks/stripe` — updates subscription status

---

## Notes / TODOs (intentionally small and contained)

- Add full TRN Marvel Rivals normalization once you confirm the schema for your key.
- Improve CS2 match-level ingest by integrating share-code match parsing.
- Add richer in-app explanations for each skill domain (already partially available via `details`).
- Add rate limiting and audit logs for production hardening.

---
