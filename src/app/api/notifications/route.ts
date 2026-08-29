import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
    const pageSize = 20;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
