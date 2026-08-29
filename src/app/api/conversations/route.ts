import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedUser, HttpError } from "@/lib/rbac";
import { startConversationSchema } from "@/lib/validation/messaging";
import { startConversation, MessagingError } from "@/lib/messaging";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await requireVerifiedUser();
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      orderBy: { updatedAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
        buyer: { select: { id: true, name: true, image: true } },
        seller: { select: { id: true, name: true, image: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    const withUnread = await Promise.all(
      conversations.map(async (c) => {
        const unread = await prisma.message.count({ where: { conversationId: c.id, senderId: { not: user.id }, readAt: null } });
        return { ...c, unreadCount: unread };
      }),
    );

    return NextResponse.json({ conversations: withUnread });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser();

    const ip = clientIp(req.headers);
    const { success } = await rateLimit(`send-message:${user.id}:${ip}`, RATE_LIMITS.SEND_MESSAGE.limit, RATE_LIMITS.SEND_MESSAGE.windowSeconds);
    if (!success) return NextResponse.json({ error: "You're sending messages too quickly. Please slow down." }, { status: 429 });

    const json = await req.json().catch(() => null);
    const parsed = startConversationSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const { conversation, message } = await startConversation(user.id, parsed.data);
    return NextResponse.json({ conversation, message }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof MessagingError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
