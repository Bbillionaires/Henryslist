import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { updateCategorySchema } from "@/lib/validation/category";
import { auditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin("categories.manage");
    const json = await req.json().catch(() => null);
    const parsed = updateCategorySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    if (parsed.data.slug) {
      const existing = await prisma.category.findFirst({ where: { slug: parsed.data.slug, NOT: { id } } });
      if (existing) return NextResponse.json({ error: "A category with this slug already exists." }, { status: 409 });
    }

    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    await auditLog({ actorId: admin.id, action: "category.update", entityType: "Category", entityId: id, metadata: parsed.data });
    revalidateTag("categories");
    return NextResponse.json({ category });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await requireAdmin("categories.manage");
    const listingCount = await prisma.listing.count({ where: { categoryId: id } });
    if (listingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${listingCount} listing(s) use this category. Hide it instead.` },
        { status: 409 },
      );
    }
    await prisma.category.delete({ where: { id } });
    await auditLog({ actorId: admin.id, action: "category.delete", entityType: "Category", entityId: id });
    revalidateTag("categories");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
