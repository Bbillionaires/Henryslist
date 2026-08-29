import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { clientEnv } from "@/lib/env";

const SITEMAP_LISTING_CAP = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientEnv.NEXT_PUBLIC_APP_URL;

  const [categories, subcategories, staticPages, listings] = await Promise.all([
    prisma.category.findMany({ where: { isHidden: false }, select: { slug: true, updatedAt: true } }),
    prisma.subcategory.findMany({ where: { isHidden: false }, select: { slug: true, category: { select: { slug: true } } } }),
    prisma.staticPage.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { publishedAt: "desc" },
      take: SITEMAP_LISTING_CAP,
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
  ]);

  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    ...categories.map((c) => ({
      url: `${base}/category/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...subcategories.map((s) => ({
      url: `${base}/category/${s.category.slug}/${s.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...staticPages.map((p) => ({
      url: `${base}/help/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    ...listings.map((l) => ({
      url: `${base}/listings/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
  ];
}
