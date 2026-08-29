import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { geocodeZip } from "@/lib/geo/geocode";
import { boundingBox, haversineMiles } from "@/lib/geo/distance";
import { subDays } from "date-fns";
import type { z } from "zod";
import type { listingSearchSchema } from "@/lib/validation/listing";

export type SearchParams = z.infer<typeof listingSearchSchema>;

export interface SearchListingResult {
  id: string;
  slug: string;
  title: string;
  priceCents: number | null;
  isFree: boolean;
  condition: string;
  thumbnailUrl: string | null;
  city: string | null;
  state: string | null;
  publishedAt: Date | null;
  favoriteCount: number;
  viewCount: number;
  categoryName: string;
  distanceMiles: number | null;
}

export interface SearchResponse {
  listings: SearchListingResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  approximate: boolean;
}

const IN_MEMORY_CAP = 500;

function toCard(listing: {
  id: string;
  slug: string;
  title: string;
  priceCents: number | null;
  isFree: boolean;
  condition: string;
  publishedAt: Date | null;
  favoriteCount: number;
  viewCount: number;
  category: { name: string };
  images: { thumbnailUrl: string }[];
  location: { city: string | null; state: string | null; lat: number | null; lng: number | null } | null;
}): Omit<SearchListingResult, "distanceMiles"> {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    priceCents: listing.priceCents,
    isFree: listing.isFree,
    condition: listing.condition,
    thumbnailUrl: listing.images[0]?.thumbnailUrl ?? null,
    city: listing.location?.city ?? null,
    state: listing.location?.state ?? null,
    publishedAt: listing.publishedAt,
    favoriteCount: listing.favoriteCount,
    viewCount: listing.viewCount,
    categoryName: listing.category.name,
  };
}

const LISTING_INCLUDE = {
  category: { select: { name: true } },
  images: { where: { isPrimary: true }, take: 1, select: { thumbnailUrl: true } },
  location: { select: { city: true, state: true, lat: true, lng: true } },
} satisfies Prisma.ListingInclude;

export async function searchListings(params: SearchParams): Promise<SearchResponse> {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };

  if (params.category) {
    const category = await prisma.category.findUnique({ where: { slug: params.category } });
    if (category) where.categoryId = category.id;
    else return emptyResponse(params);
  }
  if (params.subcategory) {
    const subcategory = await prisma.subcategory.findFirst({
      where: { slug: params.subcategory, ...(where.categoryId ? { categoryId: where.categoryId as string } : {}) },
    });
    if (subcategory) where.subcategoryId = subcategory.id;
    else return emptyResponse(params);
  }
  if (params.minPrice != null || params.maxPrice != null) {
    where.priceCents = {};
    if (params.minPrice != null) where.priceCents.gte = Math.round(params.minPrice * 100);
    if (params.maxPrice != null) where.priceCents.lte = Math.round(params.maxPrice * 100);
  }
  if (params.condition) where.condition = params.condition;
  if (params.sellerId) where.sellerId = params.sellerId;
  if (params.datePosted && params.datePosted !== "any") {
    const days = { "24h": 1, week: 7, month: 30 }[params.datePosted];
    where.publishedAt = { gte: subDays(new Date(), days) };
  }

  let origin: { lat: number; lng: number } | null = null;
  const radiusActive = !!params.zip && !!params.radius && params.radius > 0;
  if (radiusActive) {
    origin = await geocodeZip(params.zip!);
    if (origin) {
      const box = boundingBox(origin.lat, origin.lng, params.radius!);
      where.location = {
        is: { lat: { gte: box.minLat, lte: box.maxLat }, lng: { gte: box.minLng, lte: box.maxLng } },
      };
    }
  } else if (params.zip) {
    // Keyword-level location filter with no radius: fall back to exact ZIP match.
    where.location = { is: { zip: params.zip } };
  }

  let rankedIds: string[] | null = null;
  if (params.q && params.q.trim()) {
    const rows = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM "Listing" WHERE status = 'ACTIVE' AND "searchVector" @@ plainto_tsquery('english', ${params.q}) ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${params.q})) DESC LIMIT ${IN_MEMORY_CAP}`,
    );
    rankedIds = rows.map((r) => r.id);
    if (rankedIds.length === 0) return emptyResponse(params);
    where.id = { in: rankedIds };
  }

  const needsInMemoryHandling = radiusActive || params.sort === "distance" || (!!params.q && params.sort === "relevance");

  if (!needsInMemoryHandling) {
    const orderBy = mapSort(params.sort);
    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: LISTING_INCLUDE,
        orderBy,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.listing.count({ where }),
    ]);
    return {
      listings: rows.map((r) => ({ ...toCard(r), distanceMiles: null })),
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
      approximate: false,
    };
  }

  // In-memory path: fetch a bounded candidate set, then filter/sort/paginate
  // in application code (needed for exact radius distance and keyword
  // relevance ranking, which Prisma's query builder can't express).
  const candidates = await prisma.listing.findMany({
    where,
    include: LISTING_INCLUDE,
    orderBy: { publishedAt: "desc" },
    take: IN_MEMORY_CAP,
  });

  let scored: (SearchListingResult & { _rankIndex: number })[] = candidates.map((c) => ({
    ...toCard(c),
    distanceMiles: origin && c.location?.lat != null && c.location?.lng != null ? haversineMiles(origin.lat, origin.lng, c.location.lat, c.location.lng) : null,
    _rankIndex: rankedIds ? rankedIds.indexOf(c.id) : 0,
  }));

  if (radiusActive && origin) {
    scored = scored.filter((s) => s.distanceMiles != null && s.distanceMiles <= params.radius!);
  }

  scored.sort((a, b) => {
    switch (params.sort) {
      case "distance":
        return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
      case "price_asc":
        return (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity);
      case "price_desc":
        return (b.priceCents ?? -Infinity) - (a.priceCents ?? -Infinity);
      case "oldest":
        return (a.publishedAt?.getTime() ?? 0) - (b.publishedAt?.getTime() ?? 0);
      case "relevance":
        return a._rankIndex - b._rankIndex;
      case "newest":
      default:
        return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    }
  });

  const total = scored.length;
  const start = (params.page - 1) * params.pageSize;
  const page: SearchListingResult[] = scored.slice(start, start + params.pageSize).map((item) => {
    const { id, slug, title, priceCents, isFree, condition, thumbnailUrl, city, state, publishedAt, favoriteCount, viewCount, categoryName, distanceMiles } =
      item;
    return { id, slug, title, priceCents, isFree, condition, thumbnailUrl, city, state, publishedAt, favoriteCount, viewCount, categoryName, distanceMiles };
  });

  return {
    listings: page,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    approximate: total >= IN_MEMORY_CAP,
  };
}

function mapSort(sort: SearchParams["sort"]): Prisma.ListingOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { priceCents: "asc" };
    case "price_desc":
      return { priceCents: "desc" };
    case "oldest":
      return { publishedAt: "asc" };
    case "newest":
    case "relevance":
    default:
      return { publishedAt: "desc" };
  }
}

function emptyResponse(params: SearchParams): SearchResponse {
  return { listings: [], total: 0, page: params.page, pageSize: params.pageSize, totalPages: 1, approximate: false };
}
