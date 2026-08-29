import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin("admins.manage");
    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    if (target.userId === admin.id) return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });

    await prisma.adminUser.delete({ where: { id } });
    await auditLog({ actorId: admin.id, action: "admin.revoke", entityType: "AdminUser", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
