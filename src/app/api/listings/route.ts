import { NextRequest, NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/rbac";
import { createDraftListingSchema } from "@/lib/validation/listing";
import { createDraftListing, ListingValidationError } from "@/lib/listings/service";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const ip = clientIp(req.headers);
    const { success } = await rateLimit(
      `create-listing:${user.id}:${ip}`,
      RATE_LIMITS.CREATE_LISTING.limit,
      RATE_LIMITS.CREATE_LISTING.windowSeconds,
    );
    if (!success) return NextResponse.json({ error: "You're posting too quickly. Please slow down." }, { status: 429 });

    const json = await req.json().catch(() => null);
    const parsed = createDraftListingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const listing = await createDraftListing(user.id, parsed.data);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof ListingValidationError) return NextResponse.json({ errors: err.fieldErrors }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Could not create listing." }, { status: 500 });
  }
}
