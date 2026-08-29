import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { consumeSecurityToken } from "@/lib/tokens";
import { emailTemplates } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/mailer";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const userId = await consumeSecurityToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await auditLog({ actorId: userId, action: "user.reset_password", entityType: "User", entityId: userId });

  if (user.email) {
    const template = emailTemplates.accountSecurity(
      "Your password was just changed. If you didn't do this, contact support immediately.",
    );
    await sendEmail({ to: user.email, ...template });
  }

  return NextResponse.json({ ok: true });
}
