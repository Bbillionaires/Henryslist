import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/settings";
import { getRecentListings, getTrendingListings, getPopularCategories } from "@/lib/homepage";

// TEMPORARY diagnostic endpoint for the Vercel runtime-500 investigation.
// Deliberately does not swallow errors (unlike getCategoriesWithSubcategories)
// so the real Prisma/DB failure surfaces instead of being hidden. Exercises
// the exact functions the homepage calls so any failing step reports its own
// name and stack. Delete once the root cause is confirmed and fixed.
export async function GET() {
  const hasDbUrl = Boolean(process.env.DATABASE_URL);
  const dbUrlHost = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL.replace("postgresql://", "http://")).host : null;

  const steps: Record<string, unknown> = { hasDbUrl, dbUrlHost };
  const checks: Array<[string, () => Promise<unknown>]> = [
    ["rawQuery", () => prisma.$queryRaw`SELECT 1 as ok`],
    ["categoryCount", () => prisma.category.count()],
    ["getPlatformSettings", () => getPlatformSettings()],
    ["getRecentListings", () => getRecentListings(12)],
    ["getTrendingListings", () => getTrendingListings(8)],
    ["getPopularCategories", () => getPopularCategories(8)],
  ];

  for (const [name, fn] of checks) {
    try {
      steps[name] = await fn();
    } catch (err) {
      steps[name] = {
        error: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack : undefined,
      };
      return NextResponse.json(steps, { status: 500 });
    }
  }

  return NextResponse.json(steps);
}
