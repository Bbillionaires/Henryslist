import { z } from "zod";

export const REPORT_REASONS = [
  "SCAM",
  "FRAUD",
  "SPAM",
  "PROHIBITED_ITEM",
  "ILLEGAL_ACTIVITY",
  "HARASSMENT",
  "MISLEADING_INFORMATION",
  "DUPLICATE_LISTING",
  "WRONG_CATEGORY",
  "OTHER",
] as const;

export const createReportSchema = z.object({
  targetType: z.enum(["LISTING", "USER", "MESSAGE", "CONVERSATION", "REVIEW"]),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(2000).optional(),
  listingId: z.string().optional(),
  reportedUserId: z.string().optional(),
  messageId: z.string().optional(),
  conversationId: z.string().optional(),
  reviewId: z.string().optional(),
});
