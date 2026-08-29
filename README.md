# Henry's List

A modern, mobile-first classifieds marketplace. Every listing costs **$1** to
publish and stays live for **45 days** — no subscriptions.

Built with Next.js (App Router), PostgreSQL/Prisma, Auth.js, and Stripe.

## Features

- **Posting flow**: 5-step wizard (category/location → details with
  category-specific dynamic fields → photo upload → preview → Stripe
  payment), enforcing the $1/45-day rule end to end
- **Search**: full-text keyword search (Postgres `tsvector`), category/price/
  condition/date filters, ZIP-radius search, sorting, pagination
- **Messaging**: in-app conversations, blocking, per-conversation reporting
- **Favorites & saved searches**, with an hourly sweep that emails new
  matches and expiration/renewal reminders (7 days, 1 day, on expiration)
- **Reviews & reporting**, with auto-flagging after repeated reports
- **Admin dashboard** with 4 RBAC roles (Super Admin, Moderator, Support
  Agent, Finance Admin): user/listing moderation, refunds, category
  management, platform settings, content pages, analytics
- **Auth**: email/password + Google/Apple OAuth, email verification,
  password reset, account deletion
- SEO (sitemap, robots.txt, JSON-LD, canonical URLs), PWA (installable,
  offline-safe service worker), security headers, rate limiting, audit log

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | Auth.js (NextAuth v5) — Credentials, Google, Apple |
| Payments | Stripe Checkout + webhooks |
| Styling | Tailwind CSS v4 |
| Email | Pluggable: console (dev) / SMTP / Resend |
| File storage | Pluggable: local disk (dev) / S3-compatible |
| Testing | Vitest (unit + Postgres integration tests) + Playwright (e2e) |

## Local development

### Prerequisites

- Node.js 22+
- PostgreSQL 14+ running locally (or update `DATABASE_URL` to point elsewhere)

### Setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL at minimum; see below
createdb henryslist          # or: psql -c "CREATE DATABASE henryslist"
npx prisma migrate deploy
npm run seed                 # categories, legal pages, demo users + listings
npm run dev
```

Open http://localhost:3000. The seed script prints login credentials for a
`SUPER_ADMIN` account and several demo users — see its output, or read
`prisma/seed.ts`. **Change these before deploying anywhere real** (set
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` env vars
before running `npm run seed` in a shared environment).

### Required environment variables

See `.env.example` for the full list with explanations. At minimum for local
dev: `DATABASE_URL`, `AUTH_SECRET` (generate with `openssl rand -base64 32`),
`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (test-mode keys from
https://dashboard.stripe.com/test/apikeys — the app runs fine with
placeholder values for everything except actually completing a payment),
and `CRON_SECRET` (any long random string).

### Stripe webhooks locally

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

### Background jobs (listing expiration, reminders, saved-search alerts)

One job drives all three, meant to run roughly hourly:

- **Serverless/Vercel**: `GET/POST /api/cron/expire-listings` with header
  `Authorization: Bearer $CRON_SECRET`. Wire it up with Vercel Cron, a
  GitHub Actions scheduled workflow, or any external scheduler.
- **Traditional hosting**: `npm run cron` (see `scripts/cron.ts`) on a
  system crontab, e.g. `0 * * * * cd /app && npm run cron`.

Both paths call the exact same functions in `src/lib/listings/expiration.ts`
and `src/lib/saved-searches.ts`.

## Testing

```bash
npm test              # Vitest: unit tests + integration tests against a
                       # real Postgres test database (see .env.test.example)
npm run test:e2e       # Playwright, drives a real browser against a running
                       # dev server (starts one automatically if needed)
```

Integration tests **truncate** whatever database `DATABASE_URL` in
`.env.test` points to between tests — always point it at a disposable
database, never at dev/prod data. See `.env.test.example`.

## Deployment

### Vercel (recommended for the app itself)

1. Import the repo, set the environment variables from `.env.example`
   (use a managed Postgres — Vercel Postgres, Neon, Supabase, RDS, etc.)
2. Run `npx prisma migrate deploy` against the production database (e.g. via
   a one-off Vercel deploy hook, or from CI) before first traffic
3. Add a Vercel Cron job hitting `/api/cron/expire-listings` hourly with
   the `Authorization: Bearer $CRON_SECRET` header
4. Set `STORAGE_PROVIDER=s3` (Vercel's filesystem is ephemeral/read-only in
   production — `STORAGE_PROVIDER=local` will not persist uploaded photos)
5. Point `STRIPE_WEBHOOK_SECRET` at a webhook endpoint configured in the
   Stripe Dashboard for `https://yourdomain.com/api/webhooks/stripe`,
   subscribed to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded/failed`, `checkout.session.expired`,
   `payment_intent.payment_failed`, and `charge.refunded`

### Docker / traditional hosting

```bash
cp .env.example .env   # fill in real values
docker compose up -d --build
```

This starts Postgres, the app (built from the included multi-stage
`Dockerfile`, Next.js "standalone" output), and a lightweight sidecar that
calls the cron endpoint hourly. Run migrations once against the running `db`
service: `docker compose exec app npx prisma migrate deploy` (or bake it
into your deploy pipeline). For more than one app replica, switch
`STORAGE_PROVIDER` to `s3` — the `uploads` volume is local to one container.

### Database access in production

The app connects with one Postgres role that has full read/write on its own
schema. For a stricter least-privilege setup, create a dedicated role scoped
to just this database/schema (`GRANT ALL ON SCHEMA public TO app_role`
rather than a superuser), and rotate `DATABASE_URL` accordingly — Prisma
doesn't require superuser privileges at runtime, only during `migrate
deploy`.

## API

REST API under `/api/*`, documented in [`docs/API.md`](docs/API.md).
Every route validates input with Zod, enforces auth/ownership/admin-role
checks server-side, and is covered by the RBAC permission matrix in
`src/lib/permissions.ts` for admin routes.

## Architecture notes

- **Database schema**: `prisma/schema.prisma`, overview in
  [`docs/DATABASE.md`](docs/DATABASE.md)
- **Business logic lives in `src/lib/`**, not in route handlers — API routes
  are thin wrappers that validate input, call a `src/lib/*` function, and
  translate errors to HTTP responses. This is what the integration tests
  exercise directly.
- **Listing lifecycle**: `src/lib/listings/service.ts` (create/update/
  activate/renew) and `src/lib/listings/expiration.ts` (the scheduled sweep)
- **Payments**: `src/lib/payments.ts` creates Checkout Sessions and
  fulfills them; `src/app/api/webhooks/stripe/route.ts` verifies Stripe's
  signature and is idempotent per `PaymentEvent.stripeEventId`. Both paths
  call the same activation code, so payment confirmation works whether the
  webhook or the client's post-checkout redirect lands first.

## Known scope limitations (honest notes, not hidden gaps)

- **Automated image moderation** (`src/lib/images.ts: autoModerateImage`) has
  no ML/vision provider wired up — none of the standard ones (AWS
  Rekognition, Google Vision, Sightengine) had credentials available while
  building this. Uploads currently auto-approve and rely on the admin
  moderation queue + user reports. The function is isolated specifically so
  a real provider can be dropped in without touching call sites.
- **Geocoding** (`src/lib/geo/geocode.ts`) uses Zippopotam.us, a free
  keyless public API, as the default. Fine for moderate traffic; swap in
  Google Geocoding/Mapbox for an SLA at scale.
- **Rate limiting** falls back to in-process memory when
  `UPSTASH_REDIS_REST_URL`/`TOKEN` aren't set — correct for a single
  instance/dev, not for multiple replicas (each would have its own
  counters). Set the Upstash vars for real multi-instance deployments.
- **Push notifications**: `NotificationPreference.pushEnabled` and VAPID env
  vars exist in the schema/config, but no service-worker push subscription
  flow is wired up yet — email + in-app notifications are fully live.
