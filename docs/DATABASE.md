# Database overview

Full source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).
This is a narrative map of how the tables relate, not a duplicate of the
schema itself.

## Core entities

```
User ──1:1── Profile ──*:1── Location
  │
  ├─1:1── AdminUser (role: SUPER_ADMIN | MODERATOR | SUPPORT_AGENT | FINANCE_ADMIN)
  ├─1:1── NotificationPreference
  ├─1:*── Listing (as seller)
  ├─1:*── Payment
  ├─1:*── Favorite, SavedSearch, Notification, PushSubscription
  ├─1:*── Conversation (as buyer or seller)
  ├─1:*── Review (as reviewer or reviewee)
  └─1:*── Report (as reporter or target), Block (as blocker or blocked)
```

## Listings

```
Category ──1:*── Subcategory
Category ──1:*── CategoryField ──1:*── ListingAttribute
   │                                        │
   └──────────── Listing ───────────────────┘
                   │
                   ├─1:*── ListingImage
                   ├─1:*── ListingView       (view-count dedupe log)
                   ├─1:*── Payment           (type: NEW_LISTING | RENEWAL)
                   │           └─1:1── Renewal (only for RENEWAL payments)
                   │           └─1:*── PaymentEvent (Stripe webhook log, idempotency key)
                   ├─1:*── Conversation
                   ├─1:*── Favorite
                   ├─1:*── Review
                   └─1:*── ModerationAction
```

`CategoryField` defines the dynamic, category-specific form fields shown on
the posting wizard (e.g. Vehicles gets Make/Model/Year/Mileage/VIN); a
listing's actual values live in `ListingAttribute`, one row per field, with
a `numericValue` column so numeric fields (mileage, bedrooms, price-like
attributes) can be range-filtered.

## Listing lifecycle

`Listing.status` moves through `DRAFT → PENDING_PAYMENT → ACTIVE → EXPIRED`,
with `PAUSED`, `REMOVED`, `REJECTED`, and `FLAGGED` as side branches. The
$1/45-day rule lives in two places:

- `priceAtPostingCents` / `durationDaysAtPosting` — a snapshot of what this
  specific listing actually paid/ran for, independent of later admin
  changes to the platform defaults in `PlatformSetting`
- `publishedAt` / `expiresAt` — set together when a `NEW_LISTING` payment
  succeeds (`expiresAt = publishedAt + durationDaysAtPosting`), and both
  updated again on a successful `RENEWAL` payment (`Renewal.previousExpiresAt`
  → `Renewal.newExpiresAt`)

`notifiedDaysBefore: Int[]` tracks which "expiring soon" thresholds (7, 1)
have already been emailed for the *current* `expiresAt`, so the hourly
sweep in `src/lib/listings/expiration.ts` never double-sends a reminder; it
resets to `[]` on every publish/renewal.

## Search

`Listing.searchVector` (`tsvector`) is populated by a Postgres trigger
(`prisma/migrations/20260829155300_search_vector_trigger`), weighted
title > description > tags, indexed with GIN. It's deliberately not
represented as a normal Prisma field with app-level writes — the trigger is
the only thing that touches it, so it can never drift out of sync with the
row.

## Moderation & audit

`Report` is polymorphic over `targetType` (LISTING / USER / MESSAGE /
CONVERSATION / REVIEW) with one nullable FK per target type rather than a
single generic `targetId` string, so referential integrity is enforced by
Postgres rather than application code. `ModerationAction` and `AuditLog`
are separate: `ModerationAction` is the human-readable trust & safety trail
shown in admin UI, `AuditLog` is a lower-level "who did what to which
row" log used for `metadata`-rich forensic queries (e.g. every field
changed in a settings update).

## Soft deletes

`User.deletedAt` / `Listing.deletedAt` mark soft-deleted rows; the actual
`status` (`DELETED` / `REMOVED`) is still the primary thing application code
checks, `deletedAt` is the audit timestamp. Self-service account deletion
(`POST /api/account/delete`) scrubs PII (`email`, `name`, `passwordHash`,
`phone`) rather than hard-deleting the row, preserving referential
integrity for the user's past payments/reviews/messages.
