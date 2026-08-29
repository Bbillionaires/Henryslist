import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSecurityToken, TOKEN_TTL } from "@/lib/tokens";
import { emailTemplates } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/mailer";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.verified) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(req.headers);
  const { success } = await rateLimit(
    `resend-verify:${session.user.id}:${ip}`,
    RATE_LIMITS.PASSWORD_RESET_REQUEST.limit,
    RATE_LIMITS.PASSWORD_RESET_REQUEST.windowSeconds,
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const token = await createSecurityToken(session.user.id, "EMAIL_VERIFY", TOKEN_TTL.EMAIL_VERIFY);
  const template = emailTemplates.verifyEmail(token);
  await sendEmail({ to: session.user.email, ...template });

  return NextResponse.json({ ok: true });
}
