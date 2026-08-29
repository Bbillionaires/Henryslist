import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation/auth";
import { createSecurityToken, TOKEN_TTL } from "@/lib/tokens";
import { sendEmail } from "@/lib/email/mailer";
import { emailTemplates } from "@/lib/email/templates";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const { success } = await rateLimit(`register:${ip}`, RATE_LIMITS.REGISTER.limit, RATE_LIMITS.REGISTER.windowSeconds);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Don't reveal which emails are registered — respond identically either way.
    return NextResponse.json({ ok: true });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      profile: { create: { displayName: name } },
      notificationPref: { create: {} },
    },
  });

  await auditLog({ actorId: user.id, action: "user.register", entityType: "User", entityId: user.id, ip });

  const token = await createSecurityToken(user.id, "EMAIL_VERIFY", TOKEN_TTL.EMAIL_VERIFY);
  const template = emailTemplates.verifyEmail(token);
  await sendEmail({ to: normalizedEmail, ...template });

  return NextResponse.json({ ok: true });
}
