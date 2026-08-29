import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanDatabase, createTestCategory, createTestUser, createTestListing } from "@/test-utils/db";
import { startConversation, sendMessage, blockConversationParticipant, MessagingError } from "@/lib/messaging";

describe("messaging (integration)", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lets a buyer start a conversation with a seller about a listing", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const category = await createTestCategory();
    const listing = await createTestListing(seller.id, category.id, { status: "ACTIVE" });

    const { conversation, message } = await startConversation(buyer.id, { listingId: listing.id, message: "Is this still available?" });

    expect(conversation.buyerId).toBe(buyer.id);
    expect(conversation.sellerId).toBe(seller.id);
    expect(message.body).toBe("Is this still available?");

    const listingAfter = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(listingAfter.messageCount).toBe(1);
  });

  it("reuses the same conversation for repeated contact about the same listing", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const category = await createTestCategory();
    const listing = await createTestListing(seller.id, category.id, { status: "ACTIVE" });

    const first = await startConversation(buyer.id, { listingId: listing.id, message: "Hi" });
    const second = await startConversation(buyer.id, { listingId: listing.id, message: "Still there?" });

    expect(second.conversation.id).toBe(first.conversation.id);
    const messages = await prisma.message.count({ where: { conversationId: first.conversation.id } });
    expect(messages).toBe(2);
  });

  it("rejects messaging yourself", async () => {
    const seller = await createTestUser();
    const category = await createTestCategory();
    const listing = await createTestListing(seller.id, category.id, { status: "ACTIVE" });

    await expect(startConversation(seller.id, { listingId: listing.id, message: "Hi" })).rejects.toThrow(MessagingError);
  });

  it("prevents messages after one participant blocks the other", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const category = await createTestCategory();
    const listing = await createTestListing(seller.id, category.id, { status: "ACTIVE" });
    const { conversation } = await startConversation(buyer.id, { listingId: listing.id, message: "Hi" });

    await blockConversationParticipant(conversation.id, seller.id);

    await expect(sendMessage(conversation.id, buyer.id, "Are you there?")).rejects.toThrow(MessagingError);

    const updated = await prisma.conversation.findUniqueOrThrow({ where: { id: conversation.id } });
    expect(updated.status).toBe("BLOCKED");
  });

  it("rejects a non-participant from sending a message into the conversation", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const stranger = await createTestUser();
    const category = await createTestCategory();
    const listing = await createTestListing(seller.id, category.id, { status: "ACTIVE" });
    const { conversation } = await startConversation(buyer.id, { listingId: listing.id, message: "Hi" });

    await expect(sendMessage(conversation.id, stranger.id, "Let me in")).rejects.toThrow(MessagingError);
  });
});
