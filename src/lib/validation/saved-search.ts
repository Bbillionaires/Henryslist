import { z } from "zod";

export const createSavedSearchSchema = z.object({
  name: z.string().trim().min(1).max(100),
  query: z.record(z.string(), z.union([z.string(), z.number(), z.undefined()])),
  notifyByEmail: z.boolean().default(true),
});

export const updateSavedSearchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  isPaused: z.boolean().optional(),
  notifyByEmail: z.boolean().optional(),
});
