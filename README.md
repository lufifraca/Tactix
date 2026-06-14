# Tactix

A cross-game analytics and coaching platform that helps competitive gamers track performance, identify patterns, and improve through data-driven insights.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Fastify](https://img.shields.io/badge/Fastify-4-white?logo=fastify)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss)

## Features

### Multi-Game Support
- **Marvel Rivals** - Hero shooter stats via community APIs
- **Valorant** - Agent stats via Henrik API
- **Clash Royale** - Trophy/battle stats via Supercell API
- **Brawl Stars** - Brawler stats via Supercell API
- **Steam Library** - Import and track your full game library

### AI Coach
- **Natural-language insights** - Turns your raw stats into a personalized read: when you play best, when you tilt, your strongest/weakest skill areas, and one concrete focus for the week
- **Provider-agnostic** - Prefers Anthropic Claude, falls back to OpenAI, and falls back again to a deterministic rules engine, so insights render even with **no API key configured**

### Analytics Dashboard
- **Today's Performance** - Real-time win rate, K/D/A, and time played
- **Session Intelligence** - Best time of day, optimal session length, tilt detection
- **Skill Domains** - Cross-game metrics (Mechanics, Aggression, Vitality, etc.)
- **Character Breakdown** - Per-hero/agent performance stats
- **Rank Tracking** - Historical rank progression with sparkline charts

### Gamification
- **Daily Quests** - Verifiable stat-based challenges (1 free, 3 for Pro)
- **Streaks & Milestones** - Track win streaks and achievement progress
- **Shareable Rewards** - Badge + share card generation for completed quests

### Infrastructure
- **Real-time Sync** - Manual refresh + auto-refresh on stale data
- **Background Polling** - Scheduled in-process stat ingestion every 30 min (BullMQ + Redis wired in for a dedicated worker at scale)
- **Subscription System** - Stripe integration for Pro tier ($4.99/mo)
- **Error Monitoring** - Sentry for frontend errors in production

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| Backend | Fastify, Prisma ORM, PostgreSQL |
| Queue | BullMQ, Redis (Upstash) |
| Storage | S3-compatible (MinIO local, Cloudflare R2 production) |
| Auth | Email/Password, Google & Discord OAuth, Steam OpenID |
| Payments | Stripe Checkout + Customer Portal |
| Monitoring | Sentry |
| Deployment | Vercel (web), Render (API), Neon (DB) |

## Architecture

```
tactix/
├── apps/
│   ├── web/                 # Next.js dashboard
│   └── mobile/              # Expo React Native (minimal)
├── services/
│   └── api/                 # Fastify API + Prisma + BullMQ worker
├── packages/
│   └── shared/              # Shared Zod schemas and types
├── docker-compose.yml       # Local Postgres + Redis + MinIO
└── render.yaml              # Render deployment config
```

## Local Development

### Prerequisites
- Node.js 22+ (the test runner globs test files, which needs Node 21+)
- pnpm 9+
- Docker (for local infrastructure)

### 1. Start Infrastructure

```bash
pnpm docker:up
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO S3 (port 9000, console 9001)

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

**Required variables:**
- `JWT_SECRET` - Any secure random string
- `DATABASE_URL` - Postgres connection string
- `REDIS_URL` - Redis connection string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For OAuth

**Game API keys (optional for testing):**
- `SUPERCELL_API_KEY` - For Clash Royale / Brawl Stars
- `HENRIK_API_KEY` - For Valorant
- `STEAM_WEB_API_KEY` - For Steam library import

### 4. Run Database Migrations

```bash
pnpm --filter @tactix/api db:generate
pnpm --filter @tactix/api db:migrate
```

### 5. Start Development Servers

**Terminal 1 - API:**
```bash
pnpm --filter @tactix/api dev
```

**Terminal 2 - Worker (optional):**
```bash
pnpm --filter @tactix/api worker:dev
```

**Terminal 3 - Web:**
```bash
pnpm --filter @tactix/web dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- API Health: http://localhost:3001/health

## Deployment

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set root directory to `apps/web`
3. Add environment variables:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `NEXT_PUBLIC_STRIPE_PAYMENT_URL` (optional)

### Render (Backend)
1. Use `render.yaml` for infrastructure-as-code
2. Or manually create:
   - Web Service for API (`services/api`) — also runs the periodic poll in-process
   - (Optional) Background Worker (`worker:start`) to offload polling/jobs at scale
3. Add all API environment variables

### Database
- **Neon** recommended for serverless Postgres
- Run migrations: `pnpm --filter @tactix/api db:migrate`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/me` | Current user info |
| GET | `/me/library` | Game library with stats |
| GET | `/dashboard` | Full dashboard data |
| GET | `/dashboard/coach` | AI Coach insights (AI or rules-based) |
| POST | `/ingest/refresh` | Trigger stat sync |
| POST | `/link/marvel` | Link Marvel Rivals account |
| POST | `/link/valorant` | Link Valorant account |
| POST | `/link/supercell` | Link Clash Royale / Brawl Stars |
| GET | `/quests` | Daily quests |
| POST | `/billing/checkout` | Stripe checkout session |
| POST | `/webhooks/stripe` | Stripe webhook handler |

## Environment Variables

See `.env.example` for the full list. Key variables:

```env
# Core
JWT_SECRET=
DATABASE_URL=
REDIS_URL=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STEAM_WEB_API_KEY=

# Game APIs
SUPERCELL_API_KEY=
HENRIK_API_KEY=

# Stripe (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=

# AI Coach (all optional — degrades to a deterministic rules engine)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
OPENAI_API_KEY=

# Owner-only debug endpoints (comma-separated emails)
ADMIN_EMAILS=

# Monitoring
SENTRY_DSN=
```

## Testing & CI

Unit tests cover the pure analytics logic (skill scoring math, quest progress
evaluation, session detection, and time/day/length bucketing). They use Node's
built-in test runner via `tsx` — no extra dependencies.

```bash
pnpm --filter @tactix/api test
```

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push/PR to
`main`: it installs dependencies, generates the Prisma client, typechecks
`shared`, `api`, and `web`, then runs the API unit tests.

## Development

### AI-Assisted Development

This project was built with assistance from [Claude](https://claude.ai) (Anthropic's AI assistant). Claude helped with:

- **Authentication** - Email/password accounts alongside Google & Discord OAuth, with brute-force-throttled login
- **Brand & UI** - A cohesive design system (the "Steel Star" mark, Chakra Petch type, custom palette) and a top-tab dashboard navigation
- **Data ingestion** - A resilient Valorant pipeline over the Henrik API: automatic region detection, request rate-limiting, and paginated history backfill
- **Analytics & coaching** - Cross-game skill scoring, session intelligence, daily quests, and an AI coach that degrades gracefully to a deterministic rules engine
- **Shareable rewards** - Server-side SVG → PNG badge and share-card generation
- **Reliability** - In-process background polling, daily-cached coach reports, and unit tests over the core analytics, auth, and rendering logic

The collaborative workflow involved iterating on features through conversation, with Claude providing code suggestions and fixes that were reviewed and integrated into the codebase.

## License

Private - All rights reserved.
