import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
        buyer: { select: { id: true, name: true, image: true } },
        seller: { select: { id: true, name: true, image: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
