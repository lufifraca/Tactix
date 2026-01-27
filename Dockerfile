# ── Stage 1: Install dependencies ──────────────────────────────
FROM node:20-slim AS deps

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY services/api/package.json services/api/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Prepare runtime ──────────────────────────────────
FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/api/node_modules ./services/api/node_modules

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY services/api/ services/api/

RUN cd services/api && npx prisma generate

ENV NODE_ENV=production
ENV API_PORT=10000

EXPOSE 10000

# Migrate DB, then start API server + background worker together
CMD sh -c '\
  cd services/api && \
  npx prisma migrate deploy && \
  node --import @swc-node/register/esm-register src/worker.ts & \
  WORKER_PID=$! && \
  node --import @swc-node/register/esm-register src/index.ts & \
  API_PID=$! && \
  wait $API_PID $WORKER_PID'
