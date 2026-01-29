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
- **Background Polling** - Scheduled stat ingestion via BullMQ
- **Subscription System** - Stripe integration for Pro tier ($4.99/mo)
- **Error Monitoring** - Sentry integration for production

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| Backend | Fastify, Prisma ORM, PostgreSQL |
| Queue | BullMQ, Redis (Upstash) |
| Storage | S3-compatible (MinIO local, Tigris production) |
| Auth | Google OAuth, Steam OpenID |
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
- Node.js 20+
- pnpm 8+
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
   - Web Service for API (`services/api`)
   - Background Worker for polling
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

# Monitoring
SENTRY_DSN=
```

## License

Private - All rights reserved.
