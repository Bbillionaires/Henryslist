import "server-only";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPlatformSettings } from "@/lib/settings";
import { clientEnv } from "@/lib/env";
import { activateListingFromPayment, renewListingFromPayment } from "@/lib/listings/service";
import type { PaymentType } from "@prisma/client";

export class PaymentError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function createListingCheckout(listingId: string, userId: string, userEmail: string | null, type: PaymentType) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) throw new PaymentError("Listing not found", 404);

  if (type === "NEW_LISTING") {
    if (!["DRAFT", "PENDING_PAYMENT", "REJECTED"].includes(listing.status)) {
      throw new PaymentError("This listing has already been published.");
    }
    if (!listing.title || listing.title === "Untitled listing" || !listing.description) {
      throw new PaymentError("Please finish the listing details before paying.");
    }
  } else {
    if (!["ACTIVE", "PAUSED", "EXPIRED"].includes(listing.status)) {
      throw new PaymentError("This listing cannot be renewed right now.");
    }
  }

  const settings = await getPlatformSettings();
  const amountCents = settings.listing_price_cents;

  const payment = await prisma.payment.create({
    data: {
      userId,
      listingId,
      type,
      status: "PENDING",
      amountCents,
      currency: "usd",
    },
  });

  const actionLabel = type === "NEW_LISTING" ? "Listing fee" : "Listing renewal";
  const successUrl =
    type === "NEW_LISTING"
      ? `${clientEnv.NEXT_PUBLIC_APP_URL}/post/${listingId}/payment?session_id={CHECKOUT_SESSION_ID}`
      : `${clientEnv.NEXT_PUBLIC_APP_URL}/listings/${listingId}?renewed=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    type === "NEW_LISTING" ? `${clientEnv.NEXT_PUBLIC_APP_URL}/post/${listingId}/preview` : `${clientEnv.NEXT_PUBLIC_APP_URL}/listings/${listingId}`;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `${actionLabel} — ${listing.title}`,
              description: `${settings.listing_duration_days} days of visibility on ${clientEnv.NEXT_PUBLIC_SITE_NAME}`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail ?? undefined,
      client_reference_id: payment.id,
      metadata: { paymentId: payment.id, listingId, type, userId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: err instanceof Error ? err.message : "Stripe session creation failed" },
    });
    throw new PaymentError("Could not start checkout. Please try again in a moment.", 502);
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { stripeCheckoutSessionId: session.id } });

  if (type === "NEW_LISTING") {
    await prisma.listing.update({ where: { id: listingId }, data: { status: "PENDING_PAYMENT" } });
  }

  return { url: session.url!, paymentId: payment.id };
}

/**
 * Fulfills a Checkout Session by re-checking its status directly with
 * Stripe (never trusting the client's redirect alone), then applying the
 * corresponding listing state change. Safe to call multiple times — the
 * underlying activate/renew functions are idempotent — so this can run both
 * from the client-facing "confirming payment" page AND from the webhook
 * without risk of double-processing.
 */
export async function fulfillCheckoutSession(sessionId: string, requestingUserId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paymentId = session.metadata?.paymentId ?? (session.client_reference_id || undefined);
  if (!paymentId) throw new PaymentError("Unknown payment session", 404);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { listing: true } });
  if (!payment) throw new PaymentError("Payment not found", 404);
  if (payment.userId !== requestingUserId) throw new PaymentError("Not authorized to view this payment", 403);

  if (session.payment_status !== "paid") {
    return { paymentStatus: payment.status, listingStatus: payment.listing?.status ?? null };
  }

  if (payment.status !== "SUCCEEDED") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        succeededAt: new Date(),
      },
    });
  }

  const listing =
    payment.type === "NEW_LISTING" ? await activateListingFromPayment(payment.id) : await renewListingFromPayment(payment.id);

  return { paymentStatus: "SUCCEEDED", listingStatus: listing?.status ?? null };
}

/** Same fulfillment as above, but for server-to-server contexts (the Stripe
 * webhook) that have already verified authenticity via signature — no
 * requesting-user ownership check applies here. */
export async function fulfillPaymentById(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  if (payment.status === "SUCCEEDED") {
    return payment.type === "NEW_LISTING" ? activateListingFromPayment(payment.id) : renewListingFromPayment(payment.id);
  }
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", succeededAt: new Date() } });
  return payment.type === "NEW_LISTING" ? activateListingFromPayment(payment.id) : renewListingFromPayment(payment.id);
}
