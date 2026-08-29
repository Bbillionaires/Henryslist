import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const getCategoriesWithSubcategories = unstable_cache(
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

export type CategoryWithSubcategories = Awaited<ReturnType<typeof getCategoriesWithSubcategories>>[number];
