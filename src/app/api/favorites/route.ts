import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { trackEvent } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          include: { images: { where: { isPrimary: true }, take: 1 }, category: true, location: true },
        },
      },
    });
    return NextResponse.json({ favorites });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

const bodySchema = z.object({ listingId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const existing = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: user.id, listingId: parsed.data.listingId } },
    });
    if (existing) return NextResponse.json({ favorite: existing });

    const favorite = await prisma.favorite.create({
      data: { userId: user.id, listingId: parsed.data.listingId, lastKnownPriceCents: listing.priceCents },
    });
    await prisma.listing.update({ where: { id: listing.id }, data: { favoriteCount: { increment: 1 } } }).catch(() => {});
    await trackEvent("favorite", { userId: user.id, listingId: listing.id });

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
