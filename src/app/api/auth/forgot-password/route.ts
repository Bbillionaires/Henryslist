import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestPasswordResetSchema } from "@/lib/validation/auth";
import { createSecurityToken, TOKEN_TTL } from "@/lib/tokens";
import { emailTemplates } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/mailer";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const { success } = await rateLimit(
    `forgot-password:${ip}`,
    RATE_LIMITS.PASSWORD_RESET_REQUEST.limit,
    RATE_LIMITS.PASSWORD_RESET_REQUEST.windowSeconds,
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = requestPasswordResetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Always respond ok — never reveal whether an email is registered.
  if (user && user.passwordHash) {
    const token = await createSecurityToken(user.id, "PASSWORD_RESET", TOKEN_TTL.PASSWORD_RESET);
    const template = emailTemplates.passwordReset(token);
    await sendEmail({ to: user.email!, ...template });
  }

  return NextResponse.json({ ok: true });
}
