import { z } from "zod";

export const listingConditions = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR", "NOT_APPLICABLE"] as const;

export const createDraftListingSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  subcategoryId: z.string().optional().nullable(),
  location: z.object({
    country: z.string().default("US"),
    state: z.string().trim().max(60).optional(),
    city: z.string().trim().max(100).optional(),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5}(-\d{4})?$/, "Enter a valid 5-digit ZIP code")
      .optional()
      .or(z.literal("")),
  }),
});

export const updateListingDetailsSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  priceCents: z.number().int().min(0).max(100_000_000).nullable(),
  isFree: z.boolean().default(false),
  condition: z.enum(listingConditions).default("NOT_APPLICABLE"),
  tags: z.array(z.string().trim().max(30)).max(15).default([]),
  contactViaMessages: z.boolean().default(true),
  contactViaPhone: z.boolean().default(false),
  contactViaEmail: z.boolean().default(false),
  address: z.string().trim().max(200).optional(),
  showExactAddress: z.boolean().default(false),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
});

export const reorderImagesSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export const listingSearchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  condition: z.enum(listingConditions).optional(),
  zip: z.string().optional(),
  radius: z.coerce.number().optional(),
  datePosted: z.enum(["24h", "week", "month", "any"]).optional(),
  sort: z.enum(["relevance", "newest", "oldest", "price_asc", "price_desc", "distance"]).default("newest"),
  sellerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});
