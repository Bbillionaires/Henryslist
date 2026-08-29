import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedUser, HttpError } from "@/lib/rbac";
import { createListingCheckout, PaymentError } from "@/lib/payments";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireVerifiedUser();
    const { url } = await createListingCheckout(id, user.id, user.email ?? null, "RENEWAL");
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof PaymentError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}
