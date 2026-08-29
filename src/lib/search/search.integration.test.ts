import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase, createTestCategory, createTestUser } from "@/test-utils/db";
import { searchListings } from "@/lib/search";
import { listingSearchSchema } from "@/lib/validation/listing";

describe("searchListings (integration)", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function activeListing(overrides: { title: string; description?: string; priceCents?: number | null; categoryId: string; sellerId: string }) {
    return prisma.listing.create({
      data: {
        sellerId: overrides.sellerId,
        categoryId: overrides.categoryId,
        title: overrides.title,
        slug: `${overrides.title.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 8)}`,
        description: overrides.description ?? "A great item for sale.",
        priceCents: overrides.priceCents ?? 1000,
        status: "ACTIVE",
        publishedAt: new Date(),
      },
    });
  }

  it("only returns ACTIVE listings", async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    await activeListing({ title: "Active Sofa", categoryId: category.id, sellerId: user.id });
    await prisma.listing.create({
      data: {
        sellerId: user.id,
        categoryId: category.id,
        title: "Draft Sofa",
        slug: `draft-sofa-${Math.random().toString(36).slice(2, 8)}`,
        description: "Not published yet.",
        status: "DRAFT",
      },
    });

    const results = await searchListings(listingSearchSchema.parse({}));
    expect(results.listings).toHaveLength(1);
    expect(results.listings[0]?.title).toBe("Active Sofa");
  });

  it("finds a listing by keyword using full-text search", async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    await activeListing({ title: "Vintage Leather Sofa", description: "Barely used, great condition.", categoryId: category.id, sellerId: user.id });
    await activeListing({ title: "Mountain Bike", description: "Rides great, new tires.", categoryId: category.id, sellerId: user.id });

    const results = await searchListings(listingSearchSchema.parse({ q: "leather sofa" }));
    expect(results.listings).toHaveLength(1);
    expect(results.listings[0]?.title).toBe("Vintage Leather Sofa");
  });

  it("filters by price range", async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    await activeListing({ title: "Cheap Item", priceCents: 500, categoryId: category.id, sellerId: user.id });
    await activeListing({ title: "Expensive Item", priceCents: 50000, categoryId: category.id, sellerId: user.id });

    const results = await searchListings(listingSearchSchema.parse({ minPrice: "0", maxPrice: "10" }));
    expect(results.listings.map((l) => l.title)).toEqual(["Cheap Item"]);
  });

  it("sorts by price ascending and descending", async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    await activeListing({ title: "Mid", priceCents: 2000, categoryId: category.id, sellerId: user.id });
    await activeListing({ title: "Low", priceCents: 500, categoryId: category.id, sellerId: user.id });
    await activeListing({ title: "High", priceCents: 9000, categoryId: category.id, sellerId: user.id });

    const asc = await searchListings(listingSearchSchema.parse({ sort: "price_asc" }));
    expect(asc.listings.map((l) => l.title)).toEqual(["Low", "Mid", "High"]);

    const desc = await searchListings(listingSearchSchema.parse({ sort: "price_desc" }));
    expect(desc.listings.map((l) => l.title)).toEqual(["High", "Mid", "Low"]);
  });

  it("paginates results", async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    for (let i = 0; i < 5; i++) {
      await activeListing({ title: `Item ${i}`, categoryId: category.id, sellerId: user.id });
    }

    const page1 = await searchListings(listingSearchSchema.parse({ pageSize: "2", page: "1" }));
    const page2 = await searchListings(listingSearchSchema.parse({ pageSize: "2", page: "2" }));

    expect(page1.listings).toHaveLength(2);
    expect(page2.listings).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
    expect(page1.listings[0]?.id).not.toBe(page2.listings[0]?.id);
  });
});
