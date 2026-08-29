import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  try {
    const user = await requireUser();
    const existing = await prisma.favorite.findUnique({ where: { userId_listingId: { userId: user.id, listingId } } });
    if (!existing) return NextResponse.json({ ok: true });

    await prisma.favorite.delete({ where: { id: existing.id } });
    await prisma.listing.update({ where: { id: listingId }, data: { favoriteCount: { decrement: 1 } } }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
