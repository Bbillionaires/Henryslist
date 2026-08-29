import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const subcategoryId = req.nextUrl.searchParams.get("subcategoryId") ?? undefined;

  const fields = await prisma.categoryField.findMany({
    where: { OR: [{ categoryId }, subcategoryId ? { subcategoryId } : { id: "__none__" }] },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ fields });
}
