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
    if (listing.status !== "PAUSED") return NextResponse.json({ error: "Only paused listings can be resumed." }, { status: 400 });
    if (listing.expiresAt && listing.expiresAt <= new Date()) {
      return NextResponse.json({ error: "This listing's 45 days already ran out while paused. Renew it for $1 instead." }, { status: 400 });
    }

    const updated = await prisma.listing.update({ where: { id }, data: { status: "ACTIVE", pausedAt: null } });
    await auditLog({ actorId: user.id, action: "listing.resume", entityType: "Listing", entityId: id });
    return NextResponse.json({ listing: updated });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
