import { describe, it, expect } from "vitest";
import { buildListingAttributes } from "@/lib/listings/attributes";
import type { CategoryField } from "@prisma/client";

function field(overrides: Partial<CategoryField>): CategoryField {
  return {
    id: overrides.id ?? "field-1",
    categoryId: null,
    subcategoryId: null,
    key: "key",
    label: "Label",
    type: "TEXT",
    required: false,
    options: null,
    unit: null,
    sortOrder: 0,
    isSearchFilter: true,
    ...overrides,
  };
}

describe("buildListingAttributes", () => {
  it("errors when a required field is missing", () => {
    const fields = [field({ key: "make", label: "Make", required: true })];
    const { errors, attributes } = buildListingAttributes(fields, {});
    expect(errors.make).toBe("Make is required");
    expect(attributes).toHaveLength(0);
  });

  it("coerces NUMBER fields and computes numericValue for range search", () => {
    const fields = [field({ key: "mileage", label: "Mileage", type: "NUMBER" })];
    const { errors, attributes } = buildListingAttributes(fields, { mileage: "45000" });
    expect(errors).toEqual({});
    expect(attributes[0]).toMatchObject({ key: "mileage", value: "45000", numericValue: 45000 });
  });

  it("rejects a SELECT value outside the configured options", () => {
    const fields = [field({ key: "transmission", label: "Transmission", type: "SELECT", options: ["Automatic", "Manual"] })];
    const { errors } = buildListingAttributes(fields, { transmission: "Telepathic" });
    expect(errors.transmission).toMatch(/Invalid option/);
  });

  it("accepts a valid SELECT value", () => {
    const fields = [field({ key: "transmission", label: "Transmission", type: "SELECT", options: ["Automatic", "Manual"] })];
    const { errors, attributes } = buildListingAttributes(fields, { transmission: "Manual" });
    expect(errors).toEqual({});
    expect(attributes[0]?.value).toBe("Manual");
  });

  it("joins MULTISELECT values and rejects unknown options", () => {
    const fields = [field({ key: "amenities", label: "Amenities", type: "MULTISELECT", options: ["Parking", "Pool", "Gym"] })];
    const ok = buildListingAttributes(fields, { amenities: ["Parking", "Gym"] });
    expect(ok.attributes[0]?.value).toBe("Parking, Gym");

    const bad = buildListingAttributes(fields, { amenities: ["Parking", "Sauna"] });
    expect(bad.errors.amenities).toMatch(/Sauna/);
  });

  it("normalizes BOOLEAN fields", () => {
    const fields = [field({ key: "vaccinated", label: "Vaccinated", type: "BOOLEAN" })];
    const { attributes } = buildListingAttributes(fields, { vaccinated: true });
    expect(attributes[0]?.value).toBe("true");
  });

  it("skips optional fields that are left empty", () => {
    const fields = [field({ key: "vin", label: "VIN", required: false })];
    const { errors, attributes } = buildListingAttributes(fields, { vin: "" });
    expect(errors).toEqual({});
    expect(attributes).toHaveLength(0);
  });
});
