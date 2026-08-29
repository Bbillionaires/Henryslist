import "server-only";
import { prisma } from "@/lib/prisma";
import type { CategoryField } from "@prisma/client";

export async function getCategoryFieldsFor(categoryId: string, subcategoryId?: string | null): Promise<CategoryField[]> {
  return prisma.categoryField.findMany({
    where: { OR: [{ categoryId }, subcategoryId ? { subcategoryId } : { id: "__none__" }] },
    orderBy: { sortOrder: "asc" },
  });
}

export interface AttributeInput {
  key: string;
  label: string;
  value: string;
  numericValue: number | null;
  categoryFieldId: string | null;
}

/**
 * Validates raw dynamic-field values (from the posting form) against a
 * category's field definitions and turns them into ListingAttribute rows.
 * Returns validation errors keyed by field, or the ready-to-persist rows.
 */
export function buildListingAttributes(
  fields: CategoryField[],
  raw: Record<string, string | number | boolean | string[]>,
): { errors: Record<string, string>; attributes: AttributeInput[] } {
  const errors: Record<string, string> = {};
  const attributes: AttributeInput[] = [];

  for (const field of fields) {
    const value = raw[field.key];
    const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

    if (field.required && isEmpty) {
      errors[field.key] = `${field.label} is required`;
      continue;
    }
    if (isEmpty) continue;

    if (field.type === "NUMBER") {
      const num = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(num)) {
        errors[field.key] = `${field.label} must be a number`;
        continue;
      }
      attributes.push({ key: field.key, label: field.label, value: String(num), numericValue: num, categoryFieldId: field.id });
    } else if (field.type === "BOOLEAN") {
      const bool = value === true || value === "true";
      attributes.push({ key: field.key, label: field.label, value: bool ? "true" : "false", numericValue: null, categoryFieldId: field.id });
    } else if (field.type === "MULTISELECT") {
      const arr = Array.isArray(value) ? value : [String(value)];
      const options = (field.options as string[] | null) ?? [];
      const invalid = arr.filter((v) => !options.includes(v));
      if (invalid.length) {
        errors[field.key] = `Invalid option(s): ${invalid.join(", ")}`;
        continue;
      }
      attributes.push({ key: field.key, label: field.label, value: arr.join(", "), numericValue: null, categoryFieldId: field.id });
    } else if (field.type === "SELECT") {
      const str = String(value);
      const options = (field.options as string[] | null) ?? [];
      if (options.length && !options.includes(str)) {
        errors[field.key] = `Invalid option: ${str}`;
        continue;
      }
      attributes.push({ key: field.key, label: field.label, value: str, numericValue: null, categoryFieldId: field.id });
    } else {
      // TEXT, TEXTAREA, DATE
      attributes.push({ key: field.key, label: field.label, value: String(value).slice(0, 1000), numericValue: null, categoryFieldId: field.id });
    }
  }

  return { errors, attributes };
}
