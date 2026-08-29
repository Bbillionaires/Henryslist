import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { subDays } from "date-fns";

const EVENT_TYPES = [
  "listing_created",
  "listing_paid",
  "listing_view",
  "search",
  "contact_seller_click",
  "message_sent",
  "favorite",
  "renewal",
  "report_filed",
] as const;

export async function GET() {
  try {
    await requireAdmin("analytics.view");
    const since = subDays(new Date(), 30);

    const counts = await Promise.all(
      EVENT_TYPES.map(async (type) => ({
        type,
        count: await prisma.analyticsEvent.count({ where: { type, createdAt: { gte: since } } }),
      })),
    );

    const [listingsCreated30d, listingsActivated30d, totalViews30d] = await Promise.all([
      prisma.analyticsEvent.count({ where: { type: "listing_created", createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: "listing_paid", createdAt: { gte: since } } }),
      prisma.listingView.count({ where: { createdAt: { gte: since } } }),
    ]);

    const conversionRate = listingsCreated30d > 0 ? listingsActivated30d / listingsCreated30d : 0;

    return NextResponse.json({ counts, conversionRate, totalViews30d, windowDays: 30 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
