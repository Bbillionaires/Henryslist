import { z } from "zod";

export const startConversationSchema = z.object({
  listingId: z.string().optional(),
  sellerId: z.string().optional(),
  message: z.string().trim().min(1, "Write a message").max(4000),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Write a message").max(4000),
});
