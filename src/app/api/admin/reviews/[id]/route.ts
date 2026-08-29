import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const patchSchema = z.object({ action: z.enum(["remove", "restore"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin("reviews.moderate");
    const json = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const review = await prisma.review.update({
      where: { id },
      data: { status: parsed.data.action === "remove" ? "REMOVED" : "PUBLISHED" },
    });

    if (parsed.data.action === "remove") {
      await prisma.moderationAction.create({ data: { adminId: admin.id, actionType: "REVIEW_REMOVED", targetUserId: review.revieweeId } });
    }
    await auditLog({ actorId: admin.id, action: `review.${parsed.data.action}`, entityType: "Review", entityId: id });

    return NextResponse.json({ review });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
