import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { processListingImage, autoModerateImage, ALLOWED_MIME_TYPES, MAX_IMAGES_PER_LISTING } from "@/lib/images";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();

    const ip = clientIp(req.headers);
    const { success } = await rateLimit(`upload-image:${user.id}:${ip}`, RATE_LIMITS.UPLOAD_IMAGE.limit, RATE_LIMITS.UPLOAD_IMAGE.windowSeconds);
    if (!success) return NextResponse.json({ error: "Too many uploads. Please slow down." }, { status: 429 });

    const listing = await prisma.listing.findUnique({ where: { id }, include: { _count: { select: { images: true } } } });
    if (!listing || listing.sellerId !== user.id) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (listing._count.images >= MAX_IMAGES_PER_LISTING) {
      return NextResponse.json({ error: `You can upload up to ${MAX_IMAGES_PER_LISTING} photos.` }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Use JPEG, PNG, WEBP, or HEIC." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const [processed, moderation] = await Promise.all([processListingImage(buffer), autoModerateImage(buffer)]);

    const image = await prisma.listingImage.create({
      data: {
        listingId: id,
        url: processed.url,
        key: processed.key,
        thumbnailUrl: processed.thumbnailUrl,
        thumbnailKey: processed.thumbnailKey,
        width: processed.width,
        height: processed.height,
        sortOrder: listing._count.images,
        isPrimary: listing._count.images === 0,
        moderationStatus: moderation,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
