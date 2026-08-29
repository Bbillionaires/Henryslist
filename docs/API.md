# API reference

All routes are under `/api`, implemented as Next.js Route Handlers in
`src/app/api/**/route.ts`. Request/response bodies are JSON unless noted.
Every mutating endpoint validates its body with a Zod schema
(`src/lib/validation/*.ts`) and returns `400` with `{ "error": "..." }` on
failure.

**Auth**: session cookie set by Auth.js (NextAuth v5). "Signed in" below
means the route calls `requireUser()`; "verified" means `requireVerifiedUser()`
(signed in **and** email-confirmed); "admin" means `requireAdmin(permission)`
— see the permission matrix in `src/lib/permissions.ts` for exactly which of
the four admin roles (`SUPER_ADMIN`, `MODERATOR`, `SUPPORT_AGENT`,
`FINANCE_ADMIN`) each admin route requires.

## Auth & account

| Method | Path | Auth | Notes |
|---|---|---|---|
| `*` | `/api/auth/[...nextauth]` | — | Auth.js handlers: sign-in, sign-out, session, CSRF, OAuth callbacks |
| POST | `/api/auth/register` | — | Email/password sign-up; sends verification email |
| POST | `/api/auth/verify-email` | — | Consumes a single-use email-verification token |
| POST | `/api/auth/resend-verification` | signed in | Re-sends the verification email |
| POST | `/api/auth/forgot-password` | — | Always returns `200` regardless of whether the email exists |
| POST | `/api/auth/reset-password` | — | Consumes a single-use password-reset token |
| GET/PATCH | `/api/profile` | signed in | Own profile: display name, bio, location, privacy toggles |
| POST | `/api/profile/avatar` | signed in | Multipart upload; processed to a 320×320 JPEG |
| GET/PATCH | `/api/notification-preferences` | signed in | Per-notification-type email toggles |
| POST | `/api/account/change-password` | signed in | Requires current password |
| POST | `/api/account/delete` | signed in | Requires password (if set); soft-deletes, scrubs PII, removes active listings |

## Categories

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/categories` | — | All visible categories + subcategories (cached) |
| GET | `/api/categories/:categoryId/fields` | — | Dynamic form fields for a category (+ optional `?subcategoryId=`) |

## Listings

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/listings` | signed in | Create a `DRAFT` (category + location) |
| GET | `/api/listings/:id` | owner/admin, or public if publicly viewable | Full listing incl. images/attributes |
| PATCH | `/api/listings/:id` | owner | Update title/description/price/attributes/etc. |
| DELETE | `/api/listings/:id` | owner/admin | Sets status `REMOVED` |
| POST | `/api/listings/:id/images` | owner | Multipart upload; compressed + thumbnailed via sharp |
| PATCH/DELETE | `/api/listings/:id/images/:imageId` | owner | Set primary / delete |
| POST | `/api/listings/:id/images/reorder` | owner | Body: `{ orderedIds: string[] }` |
| POST | `/api/listings/:id/pause` | owner | `ACTIVE → PAUSED` |
| POST | `/api/listings/:id/resume` | owner | `PAUSED → ACTIVE` (fails if already past `expiresAt`) |
| POST | `/api/listings/:id/checkout` | verified | Creates a Stripe Checkout Session for the $1 listing fee |
| POST | `/api/listings/:id/renew/checkout` | verified | Same, for a $1 renewal |
| GET | `/api/listings/:id/checkout/verify?session_id=` | verified | Re-checks the session with Stripe directly and fulfills it — the fallback path if the webhook hasn't landed yet |

## Search

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/search` | — | Query params match `listingSearchSchema` (`q`, `category`, `subcategory`, `minPrice`, `maxPrice`, `condition`, `zip`, `radius`, `datePosted`, `sort`, `sellerId`, `page`, `pageSize`) |

## Messaging

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET/POST | `/api/conversations` | verified | List mine / start one (`{ listingId? , sellerId?, message }`) |
| GET | `/api/conversations/:id` | participant | Full thread |
| POST | `/api/conversations/:id/messages` | participant | Send a message |
| POST | `/api/conversations/:id/read` | participant | Marks the other side's messages read |
| POST | `/api/conversations/:id/block` | participant | Blocks the other participant, ends the conversation |

## Favorites & saved searches

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET/POST | `/api/favorites` | signed in | List mine / add (`{ listingId }`) |
| DELETE | `/api/favorites/:listingId` | signed in | Remove |
| GET/POST | `/api/saved-searches` | signed in | List mine / create (`{ name, query, notifyByEmail }`), max 25 |
| PATCH/DELETE | `/api/saved-searches/:id` | owner | Rename, pause/unpause, or delete |

## Reviews & reports

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/reviews` | verified | Requires a prior conversation with the reviewee; one review per (reviewer, reviewee, listing) |
| POST | `/api/reports` | signed in | `targetType` ∈ `LISTING/USER/MESSAGE/CONVERSATION/REVIEW`; 3+ open reports on a listing auto-flags it |

## Notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/notifications` | signed in | Paginated, includes `unreadCount` |
| POST | `/api/notifications/:id/read` | signed in | Mark one read |
| POST | `/api/notifications/mark-all-read` | signed in | Mark all read |

## Dashboard (self-service data views)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/dashboard/listings` | signed in | All of the caller's own listings, any status |
| GET | `/api/dashboard/payments` | signed in | The caller's own payment history |

## Admin

All require `requireAdmin(<permission>)` — see `src/lib/permissions.ts`.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET/POST | `/api/admin/categories` | `categories.manage` | List all (incl. hidden) / create |
| PATCH/DELETE | `/api/admin/categories/:id` | `categories.manage` | Update (name/slug/hidden/sortOrder) / delete (blocked if listings reference it) |
| POST | `/api/admin/categories/:id/subcategories` | `categories.manage` | Create |
| PATCH/DELETE | `/api/admin/categories/:id/subcategories/:subId` | `categories.manage` | Update / delete |
| GET | `/api/admin/users` | `users.view` | Search/paginate (`?q=&status=&page=`) |
| PATCH | `/api/admin/users/:id` | `users.suspend` or `users.ban` | `{ action: suspend\|unsuspend\|ban\|unban, reason? }` |
| DELETE | `/api/admin/users/:id` | `users.delete` | Soft-delete, removes active listings |
| GET | `/api/admin/listings` | `listings.view` | Search/paginate (`?q=&status=&page=`) |
| PATCH | `/api/admin/listings/:id` | `listings.moderate` | `{ action: approve\|reject\|remove\|restore, reason? }` |
| GET | `/api/admin/payments` | `payments.view` | Filter by `?status=&type=` |
| POST | `/api/admin/payments/:id/refund` | `payments.refund` | Issues a real Stripe refund |
| GET | `/api/admin/reports` | `reports.moderate` | Filter by `?status=` (default `OPEN`) |
| PATCH | `/api/admin/reports/:id` | `reports.moderate` | `{ action: resolve\|dismiss\|in_review, resolution? }` |
| GET | `/api/admin/reviews` | `reviews.moderate` | All reviews with report counts |
| PATCH | `/api/admin/reviews/:id` | `reviews.moderate` | `{ action: remove\|restore }` |
| GET/POST | `/api/admin/admins` | `admins.manage` | List admins / grant a role by email |
| DELETE | `/api/admin/admins/:id` | `admins.manage` | Revoke |
| GET | `/api/admin/analytics` | `analytics.view` | 30-day event counts, conversion rate |
| GET/PATCH | `/api/admin/content` , `/api/admin/content/:slug` | `content.manage` | Static legal/help pages (ToS, Privacy, etc.) |
| GET/PATCH | `/api/admin/settings` | `settings.manage` | Listing price/duration, homepage copy, featured toggle |

## Cron

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET/POST | `/api/cron/expire-listings` | `Authorization: Bearer $CRON_SECRET` (or `?secret=`) | Runs the expiration sweep + saved-search sweep. Idempotent, safe to call as often as hourly. |

## Payments webhook

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | Stripe signature (`Stripe-Signature` header, verified against `STRIPE_WEBHOOK_SECRET`) | Never trust a client-reported payment status — this (and the checkout-verify fallback above) are the only two places a listing gets activated/renewed, and both re-check with Stripe directly. Idempotent per `PaymentEvent.stripeEventId`. |
