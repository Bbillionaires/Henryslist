import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// TEMPORARY, one-time production endpoint to grant SUPER_ADMIN to one
// specific, hardcoded email. Self-disabling (refuses once that email
// already has an AdminUser row) and scoped to a single fixed address, so
// it can't be used to create an admin for an arbitrary email. Delete
// after running once.
const TARGET_EMAIL = "oneunitedenterprisellc@gmail.com";

export async function POST(req: Request) {
  const existing = await prisma.user.findUnique({ where: { email: TARGET_EMAIL }, include: { adminUser: true } });
  if (existing?.adminUser) {
    return NextResponse.json({ error: "Already an admin." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const password = typeof body.password === "string" ? body.password : null;
  if (!password) {
    return NextResponse.json({ error: "password is required in the request body" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email: TARGET_EMAIL },
    create: {
      email: TARGET_EMAIL,
      name: "OneUnited Enterprise",
      passwordHash,
      emailVerified: new Date(),
      profile: { create: { displayName: "OneUnited Enterprise" } },
      notificationPref: { create: {} },
    },
    update: { passwordHash },
  });
  await prisma.adminUser.upsert({
    where: { userId: user.id },
    create: { userId: user.id, role: "SUPER_ADMIN" },
    update: { role: "SUPER_ADMIN", active: true },
  });

  return NextResponse.json({ admin: user.email });
}
