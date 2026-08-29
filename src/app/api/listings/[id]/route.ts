import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser, HttpError } from "@/lib/rbac";
import { updateListingDetailsSchema } from "@/lib/validation/listing";
import { updateListingDetails, ListingValidationError } from "@/lib/listings/service";
import { auditLog } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      attributes: true,
      category: true,
      subcategory: true,
      location: true,
    },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const isOwner = user?.id === listing.sellerId;
  const isAdmin = !!user?.adminRole;
  const isPublicViewable = ["ACTIVE", "PAUSED", "EXPIRED"].includes(listing.status);
  if (!isOwner && !isAdmin && !isPublicViewable) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({ listing, isOwner });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = updateListingDetailsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const listing = await updateListingDetails(id, user.id, parsed.data);
    return NextResponse.json({ listing });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof ListingValidationError) return NextResponse.json({ errors: err.fieldErrors }, { status: 400 });
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (listing.sellerId !== user.id && !user.adminRole) {
      return NextResponse.json({ error: "You can only delete your own listings." }, { status: 403 });
    }

    await prisma.listing.update({
      where: { id },
      data: { status: "REMOVED", removedAt: new Date(), deletedAt: new Date() },
    });
    await auditLog({ actorId: user.id, action: "listing.delete", entityType: "Listing", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
