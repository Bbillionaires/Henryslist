import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { updateProfileSchema } from "@/lib/validation/profile";
import { backfillLocationCoordinates } from "@/lib/geo/geocode";

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
      include: { location: true },
    });
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } });
    return NextResponse.json({ profile, user: dbUser });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    const data = parsed.data;

    if (data.name) {
      await prisma.user.update({ where: { id: user.id }, data: { name: data.name } });
    }
    if (data.phone !== undefined) {
      await prisma.user.update({ where: { id: user.id }, data: { phone: data.phone || null } });
    }

    const existingProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    let locationId = existingProfile.locationId;
    if (data.city !== undefined || data.state !== undefined || data.zip !== undefined) {
      if (locationId) {
        await prisma.location.update({
          where: { id: locationId },
          data: {
            city: data.city || null,
            state: data.state || null,
            zip: data.zip || null,
            lat: null,
            lng: null,
            displayName: [data.city, data.state].filter(Boolean).join(", ") || null,
          },
        });
      } else {
        const loc = await prisma.location.create({
          data: { city: data.city || null, state: data.state || null, zip: data.zip || null, displayName: [data.city, data.state].filter(Boolean).join(", ") || null },
        });
        locationId = loc.id;
      }
      if (data.zip) backfillLocationCoordinates(locationId).catch(() => {});
    }

    const profile = await prisma.profile.update({
      where: { userId: user.id },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        showExactLocation: data.showExactLocation,
        showPhonePublicly: data.showPhonePublicly,
        showEmailPublicly: data.showEmailPublicly,
        preferredContactMethod: data.preferredContactMethod,
        isPublic: data.isPublic,
        locationId,
      },
      include: { location: true },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
