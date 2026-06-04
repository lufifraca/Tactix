FROM node:20-slim

# openssl: Prisma. fonts-*: resvg renders reward badge/card text using system
# fonts; the slim base ships none, so install sans + mono families.
RUN apt-get update && apt-get install -y openssl fonts-liberation fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# Copy workspace config + package manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY services/api/package.json services/api/

# Install all dependencies (including dev — needed for @swc-node/register)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY services/api/ services/api/

# Generate Prisma client
RUN cd services/api && npx prisma generate

ENV NODE_ENV=production
ENV API_PORT=10000

EXPOSE 10000

WORKDIR /app/services/api

# Migrate DB, then start the API. The BullMQ worker also runs embedded in this
# container by default (convenient for single-service / free-tier deploys). Set
# RUN_EMBEDDED_WORKER=false when running a dedicated worker service (see render.yaml)
# so the worker isn't started twice.
CMD sh -c 'npx prisma migrate deploy; \
  if [ "$RUN_EMBEDDED_WORKER" != "false" ]; then \
    node --import @swc-node/register/esm-register src/worker.ts & \
  fi; \
  node --import @swc-node/register/esm-register src/index.ts'
