import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { verifyPassword, hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email/mailer";
import { emailTemplates } from "@/lib/email/templates";
import { z } from "zod";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(200)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Password must be at least 8 characters with a letter and a number." }, { status: 400 });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.passwordHash) return NextResponse.json({ error: "This account doesn't have a password set." }, { status: 400 });

    const valid = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    if (dbUser.email) {
      const template = emailTemplates.accountSecurity("Your password was just changed. If you didn't do this, contact support immediately.");
      await sendEmail({ to: dbUser.email, ...template });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
