import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { SecurityTokenPurpose } from "@prisma/client";

const RAW_TOKEN_BYTES = 32;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Creates a single-use token, storing only its hash. Returns the raw token to send to the user. */
export async function createSecurityToken(userId: string, purpose: SecurityTokenPurpose, ttlMs: number): Promise<string> {
  const raw = crypto.randomBytes(RAW_TOKEN_BYTES).toString("base64url");
  await prisma.securityToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return raw;
}

/** Validates and consumes a token atomically. Returns the userId if valid, otherwise null. */
export async function consumeSecurityToken(raw: string, purpose: SecurityTokenPurpose): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const record = await prisma.securityToken.findUnique({ where: { tokenHash } });
  if (!record || record.purpose !== purpose) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  const updated = await prisma.securityToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (updated.count === 0) return null; // race: already consumed by a concurrent request

  return record.userId;
}

export const TOKEN_TTL = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};
