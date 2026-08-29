import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { createCategorySchema } from "@/lib/validation/category";
import { auditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin("categories.manage");
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { subcategories: { orderBy: { sortOrder: "asc" } }, fields: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ categories });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin("categories.manage");
    const json = await req.json().catch(() => null);
    const parsed = createCategorySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return NextResponse.json({ error: "A category with this slug already exists." }, { status: 409 });

    const maxOrder = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: { ...parsed.data, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
    });

    await auditLog({ actorId: admin.id, action: "category.create", entityType: "Category", entityId: category.id });
    revalidateTag("categories");
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
