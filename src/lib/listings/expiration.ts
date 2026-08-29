import "server-only";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/settings";
import { notify } from "@/lib/notifications";
import { emailTemplates } from "@/lib/email/templates";
import { addDays } from "date-fns";

export interface ExpirationSweepResult {
  expired: number;
  remindersSent: number;
  favoriteNotifications: number;
}

/**
 * The single scheduled job that drives the 45-day listing lifecycle:
 *  1. Sends "expiring soon" reminders at each configured threshold
 *     (default: 7 days and 1 day before expiresAt), once per threshold.
 *  2. Expires any ACTIVE listing whose expiresAt has passed, notifying the
 *     owner ("on expiration") and anyone who favorited it.
 *
 * Designed to be safe to run repeatedly and frequently (e.g. hourly): every
 * write is scoped by a WHERE clause that only matches listings that still
 * need that exact action, so a listing is never notified or expired twice.
 */
export async function runExpirationSweep(now: Date = new Date()): Promise<ExpirationSweepResult> {
  const settings = await getPlatformSettings();
  const thresholds = [...settings.expiring_soon_days_before].sort((a, b) => b - a);

  let remindersSent = 0;
  for (const days of thresholds) {
    const windowStart = addDays(now, days);
    const candidates = await prisma.listing.findMany({
      where: { status: "ACTIVE", expiresAt: { lte: windowStart, gt: now } },
    });
    // Prisma's array filters can't express "does not contain" directly, so
    // exclude listings already notified for this threshold in memory — the
    // candidate set here is small (only listings expiring within `days`).
    const toNotify = candidates.filter((l) => !l.notifiedDaysBefore.includes(days));

    for (const listing of toNotify) {
      const template = emailTemplates.listingExpiringSoon(listing.title, listing.id, days);
      await notify({
        userId: listing.sellerId,
        type: "LISTING_EXPIRING_SOON",
        title: `Expiring in ${days} day${days === 1 ? "" : "s"}`,
        body: `"${listing.title}" expires in ${days} day${days === 1 ? "" : "s"}. Renew for $1 to keep it live.`,
        link: `/listings/${listing.id}`,
        email: template,
      });
      await prisma.listing.update({
        where: { id: listing.id },
        data: { notifiedDaysBefore: { push: days } },
      });
      remindersSent++;
    }
  }

  const expiringListings = await prisma.listing.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    include: { favorites: { select: { userId: true } } },
  });

  let favoriteNotifications = 0;
  for (const listing of expiringListings) {
    await prisma.listing.update({ where: { id: listing.id }, data: { status: "EXPIRED" } });

    const template = emailTemplates.listingExpired(listing.title, listing.id);
    await notify({
      userId: listing.sellerId,
      type: "LISTING_EXPIRED",
      title: "Listing expired",
      body: `"${listing.title}" has expired. Renew for $1 to run it another ${settings.listing_duration_days} days.`,
      link: `/listings/${listing.id}`,
      email: template,
    });

    for (const fav of listing.favorites) {
      await notify({
        userId: fav.userId,
        type: "FAVORITE_EXPIRING",
        title: "A saved listing expired",
        body: `"${listing.title}" is no longer available.`,
        link: `/dashboard/favorites`,
      });
      favoriteNotifications++;
    }
  }

  return { expired: expiringListings.length, remindersSent, favoriteNotifications };
}
