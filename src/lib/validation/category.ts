import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only");

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: slugSchema,
  description: z.string().trim().max(300).optional(),
  icon: z.string().trim().max(60).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().max(300).optional().nullable(),
  icon: z.string().trim().max(60).optional().nullable(),
  isHidden: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const createSubcategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: slugSchema,
  description: z.string().trim().max(300).optional(),
});

export const updateSubcategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().max(300).optional().nullable(),
  isHidden: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
