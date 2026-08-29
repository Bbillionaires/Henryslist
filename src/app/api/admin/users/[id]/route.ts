import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["suspend", "unsuspend", "ban", "unban"]),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const json = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const permission = parsed.data.action === "ban" || parsed.data.action === "unban" ? "users.ban" : "users.suspend";
    const admin = await requireAdmin(permission);

    const target = await prisma.user.findUnique({ where: { id }, include: { adminUser: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.adminUser) return NextResponse.json({ error: "Cannot moderate another admin's account." }, { status: 403 });

    const statusMap = {
      suspend: "SUSPENDED",
      unsuspend: "ACTIVE",
      ban: "BANNED",
      unban: "ACTIVE",
    } as const;

    const updated = await prisma.user.update({
      where: { id },
      data: { status: statusMap[parsed.data.action], banReason: parsed.data.action === "ban" ? parsed.data.reason : null },
    });

    await prisma.moderationAction.create({
      data: {
        adminId: admin.id,
        actionType: parsed.data.action === "ban" ? "USER_BANNED" : parsed.data.action === "unban" ? "USER_UNBANNED" : "USER_SUSPENDED",
        targetUserId: id,
        notes: parsed.data.reason,
      },
    });
    await auditLog({ actorId: admin.id, action: `user.${parsed.data.action}`, entityType: "User", entityId: id, metadata: { reason: parsed.data.reason } });

    return NextResponse.json({ user: updated });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin("users.delete");
    const target = await prisma.user.findUnique({ where: { id }, include: { adminUser: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.adminUser) return NextResponse.json({ error: "Cannot delete another admin's account." }, { status: 403 });

    await prisma.user.update({
      where: { id },
      data: { status: "DELETED", deletedAt: new Date(), email: `deleted+${id}@henryslist.invalid`, name: "Deleted user" },
    });
    await prisma.listing.updateMany({ where: { sellerId: id, status: { in: ["ACTIVE", "PAUSED", "DRAFT"] } }, data: { status: "REMOVED", removedAt: new Date() } });

    await auditLog({ actorId: admin.id, action: "user.delete", entityType: "User", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
