import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin("reports.moderate");
    const status = req.nextUrl.searchParams.get("status") ?? "OPEN";
    const where: Prisma.ReportWhereInput = status === "ALL" ? {} : { status: status as Prisma.EnumReportStatusFilter["equals"] };

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reporter: { select: { name: true, email: true } },
        listing: { select: { id: true, title: true, slug: true } },
        reportedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ reports });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
