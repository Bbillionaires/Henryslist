import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { updateSavedSearchSchema } from "@/lib/validation/saved-search";

async function assertOwnership(id: string, userId: string) {
  const savedSearch = await prisma.savedSearch.findUnique({ where: { id } });
  if (!savedSearch || savedSearch.userId !== userId) throw new HttpError(404, "Saved search not found");
  return savedSearch;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();
    await assertOwnership(id, user.id);
    const json = await req.json().catch(() => null);
    const parsed = updateSavedSearchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const savedSearch = await prisma.savedSearch.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ savedSearch });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();
    await assertOwnership(id, user.id);
    await prisma.savedSearch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
