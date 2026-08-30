# syntax=docker/dockerfile:1

# ---- deps: install node_modules (cached separately from source changes) ---
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: generate Prisma client + build the Next.js app ------------
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Skip the runtime env schema validation during the build — real env vars
# (DATABASE_URL, STRIPE_SECRET_KEY, etc.) are supplied to the *running*
# container, not to `next build`, which only needs to type-check/bundle.
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal production image ------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# The `prisma` CLI (a devDependency, needed so a platform's pre-deploy/
# release-phase hook can run `node node_modules/prisma/build/index.js
# migrate deploy` against the production database) pulls in its own
# transitive dependencies (@prisma/config, effect, ...) that aren't part
# of the app's own runtime code paths — Next's dependency tracing for the
# standalone output below has no reason to include them. Rather than
# individually cherry-picking every package the CLI happens to need (a
# whack-a-mole that broke twice: first missing prisma itself, then its
# @prisma/config/effect chain), copy the whole post-`prisma generate`
# node_modules from the builder stage, then let the standalone output's
# own (smaller, traced) node_modules layer on top of it.
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Local file storage needs a writable directory if STORAGE_PROVIDER=local.
# For anything beyond a single-instance/demo deployment, set
# STORAGE_PROVIDER=s3 instead — this directory does not persist across
# container restarts or multiple replicas.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
