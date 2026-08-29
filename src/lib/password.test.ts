import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, isStrongPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("CorrectHorse123");
    expect(hash).not.toBe("CorrectHorse123");
    await expect(verifyPassword("CorrectHorse123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("CorrectHorse123");
    await expect(verifyPassword("WrongPassword", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (unique salt)", async () => {
    const a = await hashPassword("CorrectHorse123");
    const b = await hashPassword("CorrectHorse123");
    expect(a).not.toBe(b);
  });
});

describe("isStrongPassword", () => {
  it("requires at least 8 characters with a letter and a number", () => {
    expect(isStrongPassword("Password1")).toBe(true);
    expect(isStrongPassword("short1")).toBe(false);
    expect(isStrongPassword("alllettersnodigits")).toBe(false);
    expect(isStrongPassword("12345678")).toBe(false);
  });
});
