import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { createSubcategorySchema } from "@/lib/validation/category";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: categoryId } = await params;
  try {
    const admin = await requireAdmin("categories.manage");
    const json = await req.json().catch(() => null);
    const parsed = createSubcategorySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.subcategory.findUnique({
      where: { categoryId_slug: { categoryId, slug: parsed.data.slug } },
    });
    if (existing) return NextResponse.json({ error: "A subcategory with this slug already exists in this category." }, { status: 409 });

    const maxOrder = await prisma.subcategory.aggregate({ where: { categoryId }, _max: { sortOrder: true } });
    const subcategory = await prisma.subcategory.create({
      data: { ...parsed.data, categoryId, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
    });

    await auditLog({ actorId: admin.id, action: "subcategory.create", entityType: "Subcategory", entityId: subcategory.id });
    revalidateTag("categories");
    return NextResponse.json({ subcategory }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
