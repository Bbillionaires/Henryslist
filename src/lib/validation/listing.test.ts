import { describe, it, expect } from "vitest";
import { updateListingDetailsSchema, listingSearchSchema } from "@/lib/validation/listing";

describe("updateListingDetailsSchema", () => {
  it("accepts a valid listing payload", () => {
    const result = updateListingDetailsSchema.safeParse({
      title: "Vintage Leather Sofa",
      description: "Barely used, great condition.",
      priceCents: 25000,
      isFree: false,
      condition: "GOOD",
      tags: ["furniture"],
      contactViaMessages: true,
      contactViaPhone: false,
      contactViaEmail: false,
      attributes: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects a title that is too short", () => {
    const result = updateListingDetailsSchema.safeParse({
      title: "Hi",
      description: "Barely used, great condition and description long enough.",
      priceCents: 0,
      attributes: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative price", () => {
    const result = updateListingDetailsSchema.safeParse({
      title: "Valid title here",
      description: "Barely used, great condition and description long enough.",
      priceCents: -100,
      attributes: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("listingSearchSchema", () => {
  it("defaults sort to newest and page to 1", () => {
    const result = listingSearchSchema.parse({});
    expect(result.sort).toBe("newest");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(24);
  });

  it("coerces numeric query-string params", () => {
    const result = listingSearchSchema.parse({ minPrice: "10", maxPrice: "100", page: "2" });
    expect(result.minPrice).toBe(10);
    expect(result.maxPrice).toBe(100);
    expect(result.page).toBe(2);
  });

  it("caps pageSize at 60", () => {
    const result = listingSearchSchema.safeParse({ pageSize: "500" });
    expect(result.success).toBe(false);
  });
});
