import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "remove", "restore"]),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin("listings.moderate");
    const json = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    let data: Record<string, unknown> = {};
    let actionType: "LISTING_APPROVED" | "LISTING_REJECTED" | "LISTING_REMOVED" | "LISTING_RESTORED";
    let notifyTitle = "";
    let notifyBody = "";

    switch (parsed.data.action) {
      case "approve":
        data = { status: "ACTIVE" };
        actionType = "LISTING_APPROVED";
        notifyTitle = "Your listing was approved";
        notifyBody = `"${listing.title}" is active again.`;
        break;
      case "reject":
        data = { status: "REJECTED", rejectedAt: new Date(), rejectionReason: parsed.data.reason };
        actionType = "LISTING_REJECTED";
        notifyTitle = "Your listing was not approved";
        notifyBody = `"${listing.title}" was rejected. ${parsed.data.reason ?? ""}`.trim();
        break;
      case "remove":
        data = { status: "REMOVED", removedAt: new Date() };
        actionType = "LISTING_REMOVED";
        notifyTitle = "Your listing was removed";
        notifyBody = `"${listing.title}" was removed by a moderator. ${parsed.data.reason ?? ""}`.trim();
        break;
      case "restore":
        data = { status: listing.expiresAt && listing.expiresAt > new Date() ? "ACTIVE" : "EXPIRED" };
        actionType = "LISTING_RESTORED";
        notifyTitle = "Your listing was restored";
        notifyBody = `"${listing.title}" has been restored.`;
        break;
    }

    const updated = await prisma.listing.update({ where: { id }, data });

    await prisma.moderationAction.create({
      data: { adminId: admin.id, actionType, listingId: id, notes: parsed.data.reason },
    });
    await auditLog({ actorId: admin.id, action: `listing.${parsed.data.action}`, entityType: "Listing", entityId: id, metadata: { reason: parsed.data.reason } });
    await notify({ userId: listing.sellerId, type: "LISTING_MODERATION_UPDATE", title: notifyTitle, body: notifyBody, link: `/listings/${listing.id}` });

    return NextResponse.json({ listing: updated });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
