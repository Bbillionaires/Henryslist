import "server-only";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export async function getListingBySlug(slug: string) {
  return prisma.listing.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      attributes: true,
      category: true,
      subcategory: true,
      location: true,
      seller: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          profile: { select: { displayName: true, avatarUrl: true, showPhonePublicly: true, showEmailPublicly: true } },
          phone: true,
          email: true,
        },
      },
    },
  });
}

export function isPubliclyViewable(status: string): boolean {
  return status === "ACTIVE" || status === "PAUSED" || status === "EXPIRED";
}

/** Best-effort, deduplicated (per IP+listing per hour) view counter — never blocks or throws on the caller. */
export async function recordListingView(listingId: string, ip: string, viewerId?: string) {
  try {
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.listingView.findFirst({
      where: { listingId, ipHash, createdAt: { gte: oneHourAgo } },
    });
    if (recent) return;

    await prisma.$transaction([
      prisma.listingView.create({ data: { listingId, ipHash, viewerId } }),
      prisma.listing.update({ where: { id: listingId }, data: { viewCount: { increment: 1 } } }),
    ]);
  } catch (err) {
    console.warn("recordListingView failed:", err);
  }
}

export async function getSimilarListings(listing: { id: string; categoryId: string; sellerId: string }, take = 4) {
  return prisma.listing.findMany({
    where: { status: "ACTIVE", categoryId: listing.categoryId, id: { not: listing.id } },
    orderBy: { publishedAt: "desc" },
    take,
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      location: { select: { city: true, state: true } },
    },
  });
}
