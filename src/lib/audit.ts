import "server-only";
import { prisma } from "@/lib/prisma";

export async function auditLog(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata as never,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function trackEvent(type: string, opts: { userId?: string; listingId?: string; metadata?: Record<string, unknown> } = {}) {
  await prisma.analyticsEvent.create({
    data: {
      type,
      userId: opts.userId,
      listingId: opts.listingId,
      metadata: opts.metadata as never,
    },
  });
}
