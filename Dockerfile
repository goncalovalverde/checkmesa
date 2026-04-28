# syntax=docker/dockerfile:1

# ─── Stage 1: Dependencies ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# OpenSSL must be present so 'prisma generate' detects the correct engine target
# (linux-musl-arm64-openssl-3.0.x) for the native build environment.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bypass Prisma's OpenSSL auto-detection, which defaults to 1.1.x when it fails.
# Alpine ARM64 ships OpenSSL 3; point directly at the matching engine binary.
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# OpenSSL is required by Prisma engines for SSL detection at runtime.
# libssl1.1 is not in Alpine by default; install it before copying engines.
RUN apk add --no-cache openssl

# Pre-create the SQLite data directory with correct ownership.
# For new named volumes Docker copies this directory (including ownership)
# into the volume on first mount, so nextjs can write the database file.
RUN mkdir -p /data && chown nextjs:nodejs /data

# Copy public assets and standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + migrations (needed for runtime migrations).
# Copy the entire @prisma namespace — the CLI (prisma/build/index.js) requires
# @prisma/engines, @prisma/debug, @prisma/get-platform, etc. at runtime.
# --chown ensures the nextjs user can write engine resolution metadata at startup.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
# bcryptjs is required by the production seed script (docker-seed.js).
# The standalone bundle doesn't include it, so we copy it explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

USER nextjs

EXPOSE 3000

# Docker-native health monitoring — visible in `docker ps` and `docker inspect`.
# Complements (but does not replace) the CI probe: the CI probe gates deployment,
# this instruction gates container restarts / orchestrator scheduling.
# --start-period gives migrations time to complete before the first probe fires.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health | grep -q '"status":"ok"' || exit 1

# Run migrations then start the app.
# Use `node` directly — node_modules/.bin/ is not copied to the runner stage.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
