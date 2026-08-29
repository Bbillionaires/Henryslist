import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { verifyPassword } from "@/lib/password";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const bodySchema = z.object({ password: z.string().optional() });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Credentials-based accounts must confirm their password; OAuth-only
    // accounts (no passwordHash) have no password to confirm.
    if (dbUser.passwordHash) {
      const json = await req.json().catch(() => null);
      const parsed = bodySchema.safeParse(json);
      const valid = parsed.success && parsed.data.password ? await verifyPassword(parsed.data.password, dbUser.passwordHash) : false;
      if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.listing.updateMany({
        where: { sellerId: user.id, status: { in: ["ACTIVE", "PAUSED", "DRAFT", "PENDING_PAYMENT"] } },
        data: { status: "REMOVED", removedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          status: "DELETED",
          deletedAt: new Date(),
          email: `deleted+${user.id}@henryslist.invalid`,
          name: "Deleted user",
          passwordHash: null,
          phone: null,
        },
      }),
      prisma.profile.updateMany({ where: { userId: user.id }, data: { isPublic: false, avatarUrl: null, bio: null } }),
    ]);

    await auditLog({ actorId: user.id, action: "user.self_delete", entityType: "User", entityId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
