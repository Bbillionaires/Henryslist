import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["resolve", "dismiss", "in_review"]),
  resolution: z.string().trim().max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin("reports.moderate");
    const json = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const statusMap = { resolve: "RESOLVED", dismiss: "DISMISSED", in_review: "IN_REVIEW" } as const;

    const report = await prisma.report.update({
      where: { id },
      data: {
        status: statusMap[parsed.data.action],
        resolution: parsed.data.resolution,
        resolvedById: parsed.data.action !== "in_review" ? admin.id : undefined,
        resolvedAt: parsed.data.action !== "in_review" ? new Date() : undefined,
      },
    });

    if (parsed.data.action !== "in_review") {
      await prisma.moderationAction.create({
        data: {
          adminId: admin.id,
          actionType: parsed.data.action === "resolve" ? "REPORT_RESOLVED" : "REPORT_DISMISSED",
          notes: parsed.data.resolution,
        },
      });
    }
    await auditLog({ actorId: admin.id, action: `report.${parsed.data.action}`, entityType: "Report", entityId: id });

    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
