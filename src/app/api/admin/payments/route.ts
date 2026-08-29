import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin("payments.view");
    const status = req.nextUrl.searchParams.get("status");
    const type = req.nextUrl.searchParams.get("type");
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
    const pageSize = 25;

    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status as Prisma.EnumPaymentStatusFilter["equals"];
    if (type) where.type = type as Prisma.EnumPaymentTypeFilter["equals"];

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { name: true, email: true } }, listing: { select: { title: true, slug: true } } },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
