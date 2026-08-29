import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";

export async function GET() {
  try {
    await requireAdmin("content.manage");
    const pages = await prisma.staticPage.findMany({ orderBy: { slug: "asc" } });
    return NextResponse.json({ pages });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
