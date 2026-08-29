import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase, createTestCategory, createTestUser, createTestListing } from "@/test-utils/db";
import { activateListingFromPayment, renewListingFromPayment } from "@/lib/listings/service";
import { differenceInCalendarDays } from "date-fns";

describe("listing payment lifecycle (integration)", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function setupPendingListing() {
    const user = await createTestUser();
    const category = await createTestCategory();
    const listing = await createTestListing(user.id, category.id, { status: "PENDING_PAYMENT", title: "Vintage Leather Sofa" });
    const payment = await prisma.payment.create({
      data: { userId: user.id, listingId: listing.id, type: "NEW_LISTING", status: "PENDING", amountCents: 100 },
    });
    return { user, category, listing, payment };
  }

  it("activates a listing with expiresAt exactly 45 days after publishedAt (the $1/45-day acceptance rule)", async () => {
    const { listing, payment } = await setupPendingListing();

    const activated = await activateListingFromPayment(payment.id);

    expect(activated?.status).toBe("ACTIVE");
    expect(activated?.publishedAt).not.toBeNull();
    expect(activated?.expiresAt).not.toBeNull();
    expect(differenceInCalendarDays(activated!.expiresAt!, activated!.publishedAt!)).toBe(45);

    const reloaded = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(reloaded.status).toBe("ACTIVE");
  });

  it("is idempotent — calling it twice (duplicate webhook delivery) does not shift the expiration date", async () => {
    const { payment } = await setupPendingListing();

    const first = await activateListingFromPayment(payment.id);
    const second = await activateListingFromPayment(payment.id);

    expect(second?.publishedAt?.getTime()).toBe(first?.publishedAt?.getTime());
    expect(second?.expiresAt?.getTime()).toBe(first?.expiresAt?.getTime());
  });

  it("sends a payment receipt and listing-published notification on activation", async () => {
    const { user, payment } = await setupPendingListing();
    await activateListingFromPayment(payment.id);

    const notifications = await prisma.notification.findMany({ where: { userId: user.id } });
    const types = notifications.map((n) => n.type).sort();
    expect(types).toEqual(["LISTING_PUBLISHED", "PAYMENT_RECEIPT"]);
  });

  it("renews an already-expired listing for another 45 days starting from now, not from the old expiry", async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const longAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // expired 10 days ago
    const listing = await prisma.listing.update({
      where: { id: (await createTestListing(user.id, category.id, { status: "EXPIRED" })).id },
      data: { publishedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), expiresAt: longAgo },
    });
    const payment = await prisma.payment.create({
      data: { userId: user.id, listingId: listing.id, type: "RENEWAL", status: "PENDING", amountCents: 100 },
    });

    const renewed = await renewListingFromPayment(payment.id);

    expect(renewed?.status).toBe("ACTIVE");
    expect(differenceInCalendarDays(renewed!.expiresAt!, new Date())).toBe(45);

    const renewalRecord = await prisma.renewal.findUnique({ where: { paymentId: payment.id } });
    expect(renewalRecord).not.toBeNull();
    expect(renewalRecord?.previousExpiresAt?.getTime()).toBe(longAgo.getTime());
  });

  it("renewing a still-active listing extends from its current expiry, not from today", async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const futureExpiry = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days from now
    const draft = await createTestListing(user.id, category.id, { status: "ACTIVE" });
    const listing = await prisma.listing.update({ where: { id: draft.id }, data: { expiresAt: futureExpiry } });
    const payment = await prisma.payment.create({
      data: { userId: user.id, listingId: listing.id, type: "RENEWAL", status: "PENDING", amountCents: 100 },
    });

    const renewed = await renewListingFromPayment(payment.id);

    expect(differenceInCalendarDays(renewed!.expiresAt!, futureExpiry)).toBe(45);
  });

  it("does not create a duplicate Renewal record if called twice for the same payment", async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const listing = await createTestListing(user.id, category.id, { status: "EXPIRED" });
    const payment = await prisma.payment.create({
      data: { userId: user.id, listingId: listing.id, type: "RENEWAL", status: "PENDING", amountCents: 100 },
    });

    await renewListingFromPayment(payment.id);
    await renewListingFromPayment(payment.id);

    const renewalCount = await prisma.renewal.count({ where: { paymentId: payment.id } });
    expect(renewalCount).toBe(1);
  });
});
