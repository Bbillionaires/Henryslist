import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

const loadCategoriesWithSubcategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      where: { isHidden: false },
      orderBy: { sortOrder: "asc" },
      include: {
        subcategories: {
          where: { isHidden: false },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  },
  ["categories-with-subcategories"],
  { revalidate: 60, tags: ["categories"] },
);

/**
 * The root layout calls this on every page, including ones Next tries to
 * prerender at build time (e.g. /_not-found) — and a Docker build stage
 * commonly has no reachable database at all. Falling back to an empty list
 * keeps the build (and any transient DB outage in production) from taking
 * down every page just because the header nav couldn't load.
 */
export async function getCategoriesWithSubcategories() {
  try {
    return await loadCategoriesWithSubcategories();
  } catch (err) {
    console.error("Failed to load categories for navigation:", err);
    return [];
  }
}

export type CategoryWithSubcategories = Awaited<ReturnType<typeof getCategoriesWithSubcategories>>[number];
