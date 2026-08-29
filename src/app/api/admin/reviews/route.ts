import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";

export async function GET() {
  try {
    await requireAdmin("reviews.moderate");
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reviewer: { select: { name: true, email: true } },
        reviewee: { select: { id: true, name: true, email: true } },
        _count: { select: { reports: true } },
      },
    });
    return NextResponse.json({ reviews });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
