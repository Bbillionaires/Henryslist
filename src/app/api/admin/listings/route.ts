import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin("listings.view");
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const status = req.nextUrl.searchParams.get("status");
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
    const pageSize = 25;

    const where: Prisma.ListingWhereInput = {};
    if (q) where.title = { contains: q, mode: "insensitive" };
    if (status) where.status = status as Prisma.EnumListingStatusFilter["equals"];

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          category: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 },
          _count: { select: { reports: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return NextResponse.json({ listings, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
