import { describe, it, expect } from "vitest";
import { hasPermission } from "@/lib/permissions";

describe("hasPermission", () => {
  it("grants SUPER_ADMIN every permission it checks", () => {
    expect(hasPermission("SUPER_ADMIN", "settings.manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "users.delete")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "admins.manage")).toBe(true);
  });

  it("restricts FINANCE_ADMIN to payments/analytics, not moderation", () => {
    expect(hasPermission("FINANCE_ADMIN", "payments.refund")).toBe(true);
    expect(hasPermission("FINANCE_ADMIN", "listings.moderate")).toBe(false);
    expect(hasPermission("FINANCE_ADMIN", "users.ban")).toBe(false);
  });

  it("restricts SUPPORT_AGENT from banning or deleting users", () => {
    expect(hasPermission("SUPPORT_AGENT", "users.suspend")).toBe(true);
    expect(hasPermission("SUPPORT_AGENT", "users.ban")).toBe(false);
    expect(hasPermission("SUPPORT_AGENT", "users.delete")).toBe(false);
  });

  it("denies permission for no role", () => {
    expect(hasPermission(null, "listings.view")).toBe(false);
    expect(hasPermission(undefined, "listings.view")).toBe(false);
  });

  it("denies an unrecognized role", () => {
    expect(hasPermission("NOT_A_REAL_ROLE", "listings.view")).toBe(false);
  });
});
