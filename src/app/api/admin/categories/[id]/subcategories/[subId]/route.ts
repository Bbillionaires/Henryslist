import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { updateSubcategorySchema } from "@/lib/validation/category";
import { auditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const { subId } = await params;
  try {
    const admin = await requireAdmin("categories.manage");
    const json = await req.json().catch(() => null);
    const parsed = updateSubcategorySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const subcategory = await prisma.subcategory.update({ where: { id: subId }, data: parsed.data });
    await auditLog({ actorId: admin.id, action: "subcategory.update", entityType: "Subcategory", entityId: subId, metadata: parsed.data });
    revalidateTag("categories");
    return NextResponse.json({ subcategory });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const { subId } = await params;
  try {
    const admin = await requireAdmin("categories.manage");
    const listingCount = await prisma.listing.count({ where: { subcategoryId: subId } });
    if (listingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${listingCount} listing(s) use this subcategory. Hide it instead.` },
        { status: 409 },
      );
    }
    await prisma.subcategory.delete({ where: { id: subId } });
    await auditLog({ actorId: admin.id, action: "subcategory.delete", entityType: "Subcategory", entityId: subId });
    revalidateTag("categories");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
