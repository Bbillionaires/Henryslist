import { customAlphabet } from "nanoid";

const suffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

/** A unique, URL- and SEO-friendly slug for a listing: readable-title-ab12cd. */
export function listingSlug(title: string): string {
  const base = slugify(title) || "listing";
  return `${base}-${suffix()}`;
}
