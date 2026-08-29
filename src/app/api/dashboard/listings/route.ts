import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";

export async function GET() {
  try {
    const user = await requireUser();
    const listings = await prisma.listing.findMany({
      where: { sellerId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    return NextResponse.json({ listings });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
