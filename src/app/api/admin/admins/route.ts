import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError, ADMIN_ROLES } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin("admins.manage");
    const admins = await prisma.adminUser.findMany({
      orderBy: { grantedAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ admins });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

const bodySchema = z.object({ email: z.string().email(), role: z.enum(ADMIN_ROLES) });

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin("admins.manage");
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "No user found with that email. They must sign up first." }, { status: 404 });

    const adminUser = await prisma.adminUser.upsert({
      where: { userId: user.id },
      create: { userId: user.id, role: parsed.data.role, grantedBy: admin.id },
      update: { role: parsed.data.role, active: true, grantedBy: admin.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await auditLog({ actorId: admin.id, action: "admin.grant", entityType: "AdminUser", entityId: adminUser.id, metadata: { role: parsed.data.role } });
    return NextResponse.json({ admin: adminUser }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
