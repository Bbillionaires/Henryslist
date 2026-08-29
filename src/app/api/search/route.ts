import { NextRequest, NextResponse } from "next/server";
import { listingSearchSchema } from "@/lib/validation/listing";
import { searchListings } from "@/lib/search";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { trackEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers);
  const { success } = await rateLimit(`search:${ip}`, RATE_LIMITS.SEARCH.limit, RATE_LIMITS.SEARCH.windowSeconds);
  if (!success) return NextResponse.json({ error: "Too many searches. Please slow down." }, { status: 429 });

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listingSearchSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid search parameters" }, { status: 400 });
  }

  const result = await searchListings(parsed.data);
  trackEvent("search", { metadata: { q: parsed.data.q, category: parsed.data.category, resultCount: result.total } }).catch(() => {});

  return NextResponse.json(result);
}
