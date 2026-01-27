FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
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

# Migrate DB, then start API + worker
CMD sh -c '\
  cd services/api && \
  npx prisma migrate deploy && \
  node --import @swc-node/register/esm-register src/worker.ts & \
  node --import @swc-node/register/esm-register src/index.ts'
