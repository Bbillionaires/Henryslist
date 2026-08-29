import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeSecurityToken } from "@/lib/tokens";
import { verifyEmailSchema } from "@/lib/validation/auth";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 400 });
  }

  const userId = await consumeSecurityToken(parsed.data.token, "EMAIL_VERIFY");
  if (!userId) {
    return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  await auditLog({ actorId: userId, action: "user.verify_email", entityType: "User", entityId: userId });

  return NextResponse.json({ ok: true });
}
