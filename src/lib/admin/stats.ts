import "server-only";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, startOfWeek } from "date-fns";

export async function getDashboardStats() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const last30Days = subDays(now, 30);

  const [
    totalUsers,
    newUsers30d,
    activeListings,
    expiredListings,
    listingsToday,
    listingsThisWeek,
    revenueAgg,
    newListingPayments,
    renewalPayments,
    renewalRevenueAgg,
    failedPayments,
    openReports,
    flaggedListings,
    bannedUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.count({ where: { status: "EXPIRED" } }),
    prisma.listing.count({ where: { publishedAt: { gte: todayStart } } }),
    prisma.listing.count({ where: { publishedAt: { gte: weekStart } } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountCents: true } }),
    prisma.payment.count({ where: { status: "SUCCEEDED", type: "NEW_LISTING" } }),
    prisma.payment.count({ where: { status: "SUCCEEDED", type: "RENEWAL" } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", type: "RENEWAL" }, _sum: { amountCents: true } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.listing.count({ where: { status: "FLAGGED" } }),
    prisma.user.count({ where: { status: "BANNED" } }),
  ]);

  return {
    totalUsers,
    newUsers30d,
    activeListings,
    expiredListings,
    listingsToday,
    listingsThisWeek,
    revenueCents: revenueAgg._sum.amountCents ?? 0,
    newListingPayments,
    renewalPayments,
    renewalRevenueCents: renewalRevenueAgg._sum.amountCents ?? 0,
    failedPayments,
    openReports,
    flaggedListings,
    bannedUsers,
  };
}
