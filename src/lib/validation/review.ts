import { z } from "zod";

export const createReviewSchema = z.object({
  revieweeId: z.string().min(1),
  listingId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
});
