import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    const pref = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
    return NextResponse.json({ preferences: pref });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

const patchSchema = z.object({
  emailListingPublished: z.boolean().optional(),
  emailListingExpiring: z.boolean().optional(),
  emailListingExpired: z.boolean().optional(),
  emailNewMessage: z.boolean().optional(),
  emailSavedSearchMatch: z.boolean().optional(),
  emailPriceChange: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const pref = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
    });
    return NextResponse.json({ preferences: pref });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
