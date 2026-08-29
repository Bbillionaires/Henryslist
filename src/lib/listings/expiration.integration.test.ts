import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { addDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { cleanDatabase, createTestCategory, createTestUser, createTestListing } from "@/test-utils/db";
import { runExpirationSweep } from "@/lib/listings/expiration";

describe("runExpirationSweep (integration)", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function activeListingExpiringIn(days: number) {
    const user = await createTestUser();
    const category = await createTestCategory();
    const draft = await createTestListing(user.id, category.id, { status: "ACTIVE" });
    const listing = await prisma.listing.update({
      where: { id: draft.id },
      data: { publishedAt: subDays(new Date(), 45 - days), expiresAt: addDays(new Date(), days) },
    });
    return { user, listing };
  }

  it("sends a 7-day-before reminder exactly once", async () => {
    const { user } = await activeListingExpiringIn(6); // within the 7-day window

    const first = await runExpirationSweep();
    expect(first.remindersSent).toBe(1);

    const second = await runExpirationSweep();
    expect(second.remindersSent).toBe(0); // already notified for this threshold

    const notifications = await prisma.notification.findMany({ where: { userId: user.id, type: "LISTING_EXPIRING_SOON" } });
    expect(notifications).toHaveLength(1);
  });

  it("sends both the 7-day and 1-day reminders as a listing approaches expiry", async () => {
    const { listing } = await activeListingExpiringIn(7);
    await runExpirationSweep();

    // Fast-forward: the listing is now within 1 day of expiring.
    await prisma.listing.update({ where: { id: listing.id }, data: { expiresAt: addDays(new Date(), 1) } });
    const result = await runExpirationSweep();

    expect(result.remindersSent).toBe(1);
    const updated = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(updated.notifiedDaysBefore.sort()).toEqual([1, 7]);
  });

  it("auto-expires a listing once its expiresAt has passed, and notifies the owner", async () => {
    const { user, listing } = await activeListingExpiringIn(-1); // expired yesterday

    const result = await runExpirationSweep();
    expect(result.expired).toBe(1);

    const updated = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(updated.status).toBe("EXPIRED");

    const notification = await prisma.notification.findFirst({ where: { userId: user.id, type: "LISTING_EXPIRED" } });
    expect(notification).not.toBeNull();
  });

  it("notifies users who favorited a listing when it expires", async () => {
    const { user: seller, listing } = await activeListingExpiringIn(-1);
    const favoriter = await createTestUser();
    await prisma.favorite.create({ data: { userId: favoriter.id, listingId: listing.id } });

    const result = await runExpirationSweep();
    expect(result.favoriteNotifications).toBe(1);

    const notification = await prisma.notification.findFirst({ where: { userId: favoriter.id, type: "FAVORITE_EXPIRING" } });
    expect(notification).not.toBeNull();
    void seller;
  });

  it("does not touch listings that are not yet close to expiring", async () => {
    await activeListingExpiringIn(30);
    const result = await runExpirationSweep();
    expect(result.remindersSent).toBe(0);
    expect(result.expired).toBe(0);
  });
});
