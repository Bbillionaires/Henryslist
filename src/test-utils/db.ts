import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

/** Wipes all app tables between tests. Assumes DATABASE_URL points at a
 * disposable test database (see .env.test) — never run this against dev/prod. */
export async function cleanDatabase() {
  if (!process.env.DATABASE_URL?.includes("henryslist_test")) {
    throw new Error("Refusing to clean a database that isn't the test database.");
  }
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

export async function createTestCategory(overrides: Partial<{ name: string; slug: string }> = {}) {
  return prisma.category.create({
    data: { name: overrides.name ?? "Test Category", slug: overrides.slug ?? `test-category-${Date.now()}-${Math.random().toString(36).slice(2)}` },
  });
}

export async function createTestUser(overrides: Partial<{ email: string; name: string; emailVerified: Date | null }> = {}) {
  const passwordHash = await hashPassword("Password123");
  return prisma.user.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      name: overrides.name ?? "Test User",
      passwordHash,
      emailVerified: overrides.emailVerified === undefined ? new Date() : overrides.emailVerified,
      profile: { create: {} },
      notificationPref: { create: {} },
    },
  });
}

export async function createTestListing(sellerId: string, categoryId: string, overrides: Partial<{ status: string; title: string }> = {}) {
  return prisma.listing.create({
    data: {
      sellerId,
      categoryId,
      title: overrides.title ?? "Test Listing",
      slug: `test-listing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      description: "A test listing.",
      status: (overrides.status as never) ?? "DRAFT",
    },
  });
}
