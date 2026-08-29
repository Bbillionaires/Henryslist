import { describe, it, expect } from "vitest";
import { slugify, listingSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Vintage Leather Sofa")).toBe("vintage-leather-sofa");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(slugify("  Free!! Couch (great condition) ")).toBe("free-couch-great-condition");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("---Weird--Title---")).toBe("weird-title");
  });

  it("falls back gracefully on empty input", () => {
    expect(slugify("")).toBe("");
  });
});

describe("listingSlug", () => {
  it("appends a random suffix so titles never collide", () => {
    const a = listingSlug("Vintage Leather Sofa");
    const b = listingSlug("Vintage Leather Sofa");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^vintage-leather-sofa-[a-z0-9]{6}$/);
  });

  it("uses a fallback base for titles with no alphanumeric characters", () => {
    expect(listingSlug("!!!")).toMatch(/^listing-[a-z0-9]{6}$/);
  });
});
