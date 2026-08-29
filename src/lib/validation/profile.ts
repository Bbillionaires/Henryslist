import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  displayName: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+().\s-]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(60).optional(),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/)
    .optional()
    .or(z.literal("")),
  showExactLocation: z.boolean().optional(),
  showPhonePublicly: z.boolean().optional(),
  showEmailPublicly: z.boolean().optional(),
  preferredContactMethod: z.enum(["MESSAGE", "PHONE", "EMAIL"]).optional(),
  isPublic: z.boolean().optional(),
});
