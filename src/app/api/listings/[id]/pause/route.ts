import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing || listing.sellerId !== user.id) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (listing.status !== "ACTIVE") return NextResponse.json({ error: "Only active listings can be paused." }, { status: 400 });

    const updated = await prisma.listing.update({ where: { id }, data: { status: "PAUSED", pausedAt: new Date() } });
    await auditLog({ actorId: user.id, action: "listing.pause", entityType: "Listing", entityId: id });
    return NextResponse.json({ listing: updated });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
