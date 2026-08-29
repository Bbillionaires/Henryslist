import "server-only";
import { prisma } from "@/lib/prisma";
import { listingSlug } from "@/lib/slug";
import { getPlatformSettings } from "@/lib/settings";
import { getCategoryFieldsFor, buildListingAttributes } from "@/lib/listings/attributes";
import { notify } from "@/lib/notifications";
import { emailTemplates } from "@/lib/email/templates";
import { trackEvent } from "@/lib/audit";
import { backfillLocationCoordinates } from "@/lib/geo/geocode";
import { addDays } from "date-fns";
import type { z } from "zod";
import type { createDraftListingSchema, updateListingDetailsSchema } from "@/lib/validation/listing";

export class ListingValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super("Listing validation failed");
  }
}

export async function createDraftListing(sellerId: string, input: z.infer<typeof createDraftListingSchema>) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new ListingValidationError({ categoryId: "Category not found" });

  if (input.subcategoryId) {
    const sub = await prisma.subcategory.findUnique({ where: { id: input.subcategoryId } });
    if (!sub || sub.categoryId !== input.categoryId) throw new ListingValidationError({ subcategoryId: "Invalid subcategory" });
  }

  const location = await prisma.location.create({
    data: {
      country: input.location.country || "US",
      state: input.location.state || null,
      city: input.location.city || null,
      zip: input.location.zip || null,
      displayName: [input.location.city, input.location.state].filter(Boolean).join(", ") || null,
    },
  });

  const listing = await prisma.listing.create({
    data: {
      sellerId,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId || null,
      locationId: location.id,
      title: "Untitled listing",
      slug: listingSlug("untitled-listing"),
      description: "",
      status: "DRAFT",
    },
  });

  await trackEvent("listing_created", { userId: sellerId, listingId: listing.id });
  // Best-effort, non-blocking: search still works without coordinates, just
  // without radius filtering for this listing until it resolves.
  backfillLocationCoordinates(location.id).catch(() => {});
  return listing;
}

export async function updateListingDetails(
  listingId: string,
  sellerId: string,
  input: z.infer<typeof updateListingDetailsSchema>,
) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== sellerId) throw new Error("Listing not found");
  if (!["DRAFT", "PENDING_PAYMENT", "ACTIVE", "PAUSED"].includes(listing.status)) {
    throw new Error("This listing can no longer be edited.");
  }

  const fields = await getCategoryFieldsFor(listing.categoryId, listing.subcategoryId);
  const { errors, attributes } = buildListingAttributes(fields, input.attributes);
  if (Object.keys(errors).length > 0) throw new ListingValidationError(errors);

  const slug = listing.slug && listing.status !== "DRAFT" ? listing.slug : listingSlug(input.title);

  const updated = await prisma.$transaction(async (tx) => {
    if (listing.locationId) {
      await tx.location.update({
        where: { id: listing.locationId },
        data: { address: input.address || null, showAddressPublicly: input.showExactAddress },
      });
    }

    await tx.listingAttribute.deleteMany({ where: { listingId } });
    if (attributes.length) {
      await tx.listingAttribute.createMany({
        data: attributes.map((a) => ({ ...a, listingId })),
      });
    }

    return tx.listing.update({
      where: { id: listingId },
      data: {
        title: input.title,
        slug,
        description: input.description,
        priceCents: input.isFree ? 0 : input.priceCents,
        isFree: input.isFree,
        condition: input.condition,
        tags: input.tags,
        contactViaMessages: input.contactViaMessages,
        contactViaPhone: input.contactViaPhone,
        contactViaEmail: input.contactViaEmail,
      },
    });
  });

  return updated;
}

/**
 * Called from the Stripe webhook once a NEW_LISTING payment succeeds.
 * Idempotent: if the listing is already ACTIVE from this payment, does
 * nothing (protects against duplicate webhook delivery).
 */
export async function activateListingFromPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { listing: true } });
  if (!payment || !payment.listing) return null;
  if (payment.listing.status === "ACTIVE" && payment.listing.publishedAt) return payment.listing;

  const settings = await getPlatformSettings();
  const now = new Date();
  const expiresAt = addDays(now, settings.listing_duration_days);

  const listing = await prisma.listing.update({
    where: { id: payment.listing.id },
    data: {
      status: "ACTIVE",
      publishedAt: now,
      expiresAt,
      priceAtPostingCents: payment.amountCents,
      durationDaysAtPosting: settings.listing_duration_days,
      notifiedDaysBefore: [],
    },
  });

  await trackEvent("listing_paid", { userId: payment.userId, listingId: listing.id, metadata: { amountCents: payment.amountCents } });

  const template = emailTemplates.listingPublished(listing.title, listing.id, expiresAt);
  await notify({
    userId: payment.userId,
    type: "LISTING_PUBLISHED",
    title: "Your listing is live!",
    body: `"${listing.title}" is now active and will run for ${settings.listing_duration_days} days.`,
    link: `/listings/${listing.id}`,
    email: template,
  });

  const receiptTemplate = emailTemplates.paymentReceipt(`$${(payment.amountCents / 100).toFixed(2)}`, listing.title, listing.id);
  await notify({
    userId: payment.userId,
    type: "PAYMENT_RECEIPT",
    title: "Payment receipt",
    body: `Receipt for ${listing.title}: $${(payment.amountCents / 100).toFixed(2)}`,
    link: `/dashboard/payments`,
    email: receiptTemplate,
  });

  return listing;
}

/** Called from the Stripe webhook once a RENEWAL payment succeeds. */
export async function renewListingFromPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { listing: true } });
  if (!payment || !payment.listing) return null;

  const existingRenewal = await prisma.renewal.findUnique({ where: { paymentId } });
  if (existingRenewal) return payment.listing;

  const settings = await getPlatformSettings();
  const now = new Date();
  const previousExpiresAt = payment.listing.expiresAt;
  const base = previousExpiresAt && previousExpiresAt > now ? previousExpiresAt : now;
  const newExpiresAt = addDays(base, settings.listing_duration_days);

  const [listing] = await prisma.$transaction([
    prisma.listing.update({
      where: { id: payment.listing.id },
      data: {
        status: "ACTIVE",
        expiresAt: newExpiresAt,
        removedAt: null,
        priceAtPostingCents: payment.amountCents,
        durationDaysAtPosting: settings.listing_duration_days,
        notifiedDaysBefore: [],
      },
    }),
    prisma.renewal.create({
      data: { listingId: payment.listing.id, paymentId, previousExpiresAt, newExpiresAt },
    }),
  ]);

  await trackEvent("renewal", { userId: payment.userId, listingId: listing.id, metadata: { amountCents: payment.amountCents } });

  const template = emailTemplates.listingRenewed(listing.title, listing.id, newExpiresAt);
  await notify({
    userId: payment.userId,
    type: "LISTING_RENEWED",
    title: "Listing renewed",
    body: `"${listing.title}" is active again until ${newExpiresAt.toLocaleDateString()}.`,
    link: `/listings/${listing.id}`,
    email: template,
  });

  return listing;
}

export async function markPaymentFailed(paymentId: string, reason?: string) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED", failureReason: reason },
    include: { listing: true },
  });
  if (payment.listing && payment.listing.status === "PENDING_PAYMENT") {
    await prisma.listing.update({ where: { id: payment.listing.id }, data: { status: "DRAFT" } });
  }
  if (payment.listing) {
    const template = emailTemplates.paymentFailed(payment.listing.title);
    await notify({
      userId: payment.userId,
      type: "PAYMENT_FAILED",
      title: "Payment failed",
      body: `Your payment for "${payment.listing.title}" did not go through.`,
      link: `/dashboard/listings`,
      email: template,
    });
  }
  return payment;
}
