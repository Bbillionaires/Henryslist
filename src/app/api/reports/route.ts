import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { createReportSchema } from "@/lib/validation/report";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { trackEvent, auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const ip = clientIp(req.headers);
    const { success } = await rateLimit(`report:${user.id}:${ip}`, RATE_LIMITS.CREATE_REPORT.limit, RATE_LIMITS.CREATE_REPORT.windowSeconds);
    if (!success) return NextResponse.json({ error: "You're reporting too frequently. Please slow down." }, { status: 429 });

    const json = await req.json().catch(() => null);
    const parsed = createReportSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const report = await prisma.report.create({
      data: { reporterId: user.id, ...parsed.data },
    });

    await trackEvent("report_filed", { userId: user.id, listingId: parsed.data.listingId, metadata: { reason: parsed.data.reason } });
    await auditLog({ actorId: user.id, action: "report.create", entityType: parsed.data.targetType, entityId: report.id, ip });

    if (parsed.data.listingId) {
      const openReports = await prisma.report.count({ where: { listingId: parsed.data.listingId, status: { in: ["OPEN", "IN_REVIEW"] } } });
      // Multiple independent reports on the same listing is a strong signal —
      // flag it for a human moderator rather than acting automatically.
      if (openReports >= 3) {
        await prisma.listing.updateMany({ where: { id: parsed.data.listingId, status: "ACTIVE" }, data: { status: "FLAGGED" } });
      }
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
