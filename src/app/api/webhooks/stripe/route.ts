import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { fulfillPaymentById, PaymentError } from "@/lib/payments";
import { markPaymentFailed } from "@/lib/listings/service";

// Stripe webhooks must receive the exact raw request body to verify the
// signature — do not parse it as JSON before this point, and do not run
// this route through any body-modifying middleware.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: Stripe may deliver the same event more than once. Recording
  // every event by its unique Stripe id — and skipping if we've seen it —
  // guarantees we never double-activate a listing or double-count revenue.
  const alreadyProcessed = await prisma.paymentEvent.findUnique({ where: { stripeEventId: event.id } });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error(`Error handling Stripe event ${event.id} (${event.type}):`, err);
    // Still record the event so we don't spin forever on a poison message,
    // but return 500 so Stripe retries in case it was a transient error.
    await prisma.paymentEvent.create({ data: { stripeEventId: event.id, type: event.type, payload: event as unknown as object } }).catch(() => {});
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  await prisma.paymentEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
      payload: event as unknown as object,
      paymentId: extractPaymentId(event),
    },
  });

  return NextResponse.json({ received: true });
}

function extractPaymentId(event: Stripe.Event): string | undefined {
  const obj = event.data.object as { metadata?: { paymentId?: string } };
  return obj.metadata?.paymentId;
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId ?? session.client_reference_id;
      if (!paymentId) return;
      if (session.payment_status === "paid") {
        await fulfillPaymentById(paymentId).catch((err) => {
          if (!(err instanceof PaymentError)) throw err;
        });
      }
      return;
    }

    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId ?? session.client_reference_id;
      if (!paymentId) return;
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (payment && payment.status === "PENDING") {
        await markPaymentFailed(paymentId, event.type);
      }
      return;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: intent.id } });
      if (payment && payment.status === "PENDING") {
        await markPaymentFailed(payment.id, intent.last_payment_error?.message ?? "payment_intent.payment_failed");
      }
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      const payment = await prisma.payment.findFirst({
        where: { OR: [{ stripeChargeId: charge.id }, ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : [])] },
      });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "REFUNDED",
            refundedAmountCents: charge.amount_refunded,
            refundedAt: new Date(),
          },
        });
      }
      return;
    }

    default:
      return;
  }
}
