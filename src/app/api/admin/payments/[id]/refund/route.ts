import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { stripe } from "@/lib/stripe";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const bodySchema = z.object({ reason: z.string().trim().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin("payments.refund");
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status !== "SUCCEEDED") return NextResponse.json({ error: "Only successful payments can be refunded." }, { status: 400 });
    if (!payment.stripePaymentIntentId) return NextResponse.json({ error: "No payment intent on file for this payment." }, { status: 400 });

    await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId, reason: "requested_by_customer" });

    const updated = await prisma.payment.update({
      where: { id },
      data: { status: "REFUNDED", refundedAmountCents: payment.amountCents, refundedAt: new Date(), refundReason: parsed.data.reason },
    });

    await prisma.moderationAction.create({
      data: { adminId: admin.id, actionType: "REFUND_ISSUED", notes: parsed.data.reason, targetUserId: payment.userId },
    });
    await auditLog({ actorId: admin.id, action: "payment.refund", entityType: "Payment", entityId: id, metadata: { reason: parsed.data.reason } });

    return NextResponse.json({ payment: updated });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Refund failed. Check Stripe dashboard for details." }, { status: 502 });
  }
}
