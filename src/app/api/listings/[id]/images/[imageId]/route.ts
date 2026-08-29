import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { storage } from "@/lib/storage";
import { z } from "zod";

const patchSchema = z.object({ isPrimary: z.boolean().optional() });

async function assertOwnership(listingId: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) throw new HttpError(404, "Listing not found");
  return listing;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  try {
    const user = await requireUser();
    await assertOwnership(id, user.id);
    const json = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    if (parsed.data.isPrimary) {
      await prisma.$transaction([
        prisma.listingImage.updateMany({ where: { listingId: id }, data: { isPrimary: false } }),
        prisma.listingImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
      ]);
    }

    const image = await prisma.listingImage.findUnique({ where: { id: imageId } });
    return NextResponse.json({ image });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  try {
    const user = await requireUser();
    await assertOwnership(id, user.id);

    const image = await prisma.listingImage.findUnique({ where: { id: imageId } });
    if (!image || image.listingId !== id) return NextResponse.json({ error: "Image not found" }, { status: 404 });

    await prisma.listingImage.delete({ where: { id: imageId } });

    // Best-effort cleanup of the underlying file; never block the API response on it.
    storage.delete(image.key).catch(() => {});
    storage.delete(image.thumbnailKey).catch(() => {});

    if (image.isPrimary) {
      const next = await prisma.listingImage.findFirst({ where: { listingId: id }, orderBy: { sortOrder: "asc" } });
      if (next) await prisma.listingImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
