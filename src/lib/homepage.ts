import "server-only";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

const LISTING_CARD_INCLUDE = {
  images: { where: { isPrimary: true }, take: 1 },
  location: { select: { city: true, state: true } },
} as const;

export async function getRecentListings(take = 12) {
  return prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { publishedAt: "desc" },
    take,
    include: LISTING_CARD_INCLUDE,
  });
}

/** "Featured" = organically trending — most viewed + favorited among listings published this week. No manual curation needed, no fabricated data. */
export async function getTrendingListings(take = 8) {
  return prisma.listing.findMany({
    where: { status: "ACTIVE", publishedAt: { gte: subDays(new Date(), 14) } },
    orderBy: [{ favoriteCount: "desc" }, { viewCount: "desc" }],
    take,
    include: LISTING_CARD_INCLUDE,
  });
}

export async function getPopularCategories(take = 8) {
  const grouped = await prisma.listing.groupBy({
    by: ["categoryId"],
    where: { status: "ACTIVE" },
    _count: { categoryId: true },
    orderBy: { _count: { categoryId: "desc" } },
    take,
  });
  const categories = await prisma.category.findMany({ where: { id: { in: grouped.map((g) => g.categoryId) }, isHidden: false } });
  const countMap = new Map(grouped.map((g) => [g.categoryId, g._count.categoryId]));
  return categories
    .map((c) => ({ ...c, activeListingCount: countMap.get(c.id) ?? 0 }))
    .sort((a, b) => b.activeListingCount - a.activeListingCount);
}
