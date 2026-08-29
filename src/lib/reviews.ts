import "server-only";
import { prisma } from "@/lib/prisma";

export async function getRatingSummary(userId: string): Promise<{ average: number; count: number }> {
  const agg = await prisma.review.aggregate({
    where: { revieweeId: userId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { average: agg._avg.rating ?? 0, count: agg._count.rating };
}
