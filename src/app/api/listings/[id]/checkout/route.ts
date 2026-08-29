import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedUser, HttpError } from "@/lib/rbac";
import { createListingCheckout, PaymentError } from "@/lib/payments";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireVerifiedUser();

    const ip = clientIp(req.headers);
    const { success } = await rateLimit(`checkout:${user.id}:${ip}`, RATE_LIMITS.CHECKOUT.limit, RATE_LIMITS.CHECKOUT.windowSeconds);
    if (!success) return NextResponse.json({ error: "Too many checkout attempts. Please try again later." }, { status: 429 });

    const { url } = await createListingCheckout(id, user.id, user.email ?? null, "NEW_LISTING");
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof PaymentError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}
