import "server-only";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { emailTemplates } from "@/lib/email/templates";
import { trackEvent } from "@/lib/audit";

export class MessagingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

async function assertNotBlocked(userAId: string, userBId: string) {
  const block = await prisma.block.findFirst({
    where: { OR: [{ blockerId: userAId, blockedId: userBId }, { blockerId: userBId, blockedId: userAId }] },
  });
  if (block) throw new MessagingError("You can't message this user.", 403);
}

export async function startConversation(buyerId: string, input: { listingId?: string; sellerId?: string; message: string }) {
  let sellerId = input.sellerId;
  const listingId = input.listingId ?? null;

  if (listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new MessagingError("Listing not found", 404);
    if (!listing.contactViaMessages) throw new MessagingError("This seller does not accept messages for this listing.");
    sellerId = listing.sellerId;
  }
  if (!sellerId) throw new MessagingError("Missing recipient");
  if (sellerId === buyerId) throw new MessagingError("You can't message yourself.");

  await assertNotBlocked(buyerId, sellerId);

  const existing = listingId
    ? await prisma.conversation.findUnique({ where: { listingId_buyerId_sellerId: { listingId, buyerId, sellerId } } })
    : await prisma.conversation.findFirst({ where: { listingId: null, buyerId, sellerId } });

  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: { listingId, buyerId, sellerId },
    }));

  const message = await sendMessage(conversation.id, buyerId, input.message);
  return { conversation, message };
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { listing: true } });
  if (!conversation) throw new MessagingError("Conversation not found", 404);
  if (conversation.buyerId !== senderId && conversation.sellerId !== senderId) {
    throw new MessagingError("You are not part of this conversation.", 403);
  }
  if (conversation.status === "BLOCKED") throw new MessagingError("This conversation is no longer available.", 403);

  const recipientId = conversation.buyerId === senderId ? conversation.sellerId : conversation.buyerId;
  await assertNotBlocked(senderId, recipientId);

  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId, body } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);

  if (conversation.listingId) {
    await prisma.listing.update({ where: { id: conversation.listingId }, data: { messageCount: { increment: 1 } } }).catch(() => {});
  }

  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true, email: true } });
  const template = emailTemplates.newMessage(sender?.name ?? "A user", conversation.listing?.title ?? null, conversationId);
  await notify({
    userId: recipientId,
    type: "NEW_MESSAGE",
    title: `New message from ${sender?.name ?? "a user"}`,
    body: body.slice(0, 140),
    link: `/dashboard/messages/${conversationId}`,
    email: template,
  });

  await trackEvent("message_sent", { userId: senderId, listingId: conversation.listingId ?? undefined });

  return message;
}

export async function markConversationRead(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId)) {
    throw new MessagingError("Conversation not found", 404);
  }
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function blockConversationParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId)) {
    throw new MessagingError("Conversation not found", 404);
  }
  const otherId = conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;

  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: otherId } },
      create: { blockerId: userId, blockedId: otherId },
      update: {},
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { status: "BLOCKED" } }),
  ]);
}
