import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { reorderImagesSchema } from "@/lib/validation/listing";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing || listing.sellerId !== user.id) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const json = await req.json().catch(() => null);
    const parsed = reorderImagesSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const images = await prisma.listingImage.findMany({ where: { listingId: id } });
    const validIds = new Set(images.map((i) => i.id));
    if (parsed.data.orderedIds.some((imgId) => !validIds.has(imgId))) {
      return NextResponse.json({ error: "Invalid image id in order" }, { status: 400 });
    }

    await prisma.$transaction(
      parsed.data.orderedIds.map((imgId, index) => prisma.listingImage.update({ where: { id: imgId }, data: { sortOrder: index } })),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
