import { NextRequest, NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/rbac";
import { fulfillCheckoutSession, PaymentError } from "@/lib/payments";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const result = await fulfillCheckoutSession(sessionId, user.id);
    return NextResponse.json({ status: result.listingStatus, paymentStatus: result.paymentStatus });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof PaymentError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }
}
