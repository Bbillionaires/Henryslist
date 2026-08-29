import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    await requireAdmin("content.manage");
    const page = await prisma.staticPage.findUnique({ where: { slug } });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const admin = await requireAdmin("content.manage");
    const json = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const page = await prisma.staticPage.upsert({
      where: { slug },
      create: { slug, title: parsed.data.title, body: parsed.data.body, updatedBy: admin.id },
      update: { title: parsed.data.title, body: parsed.data.body, updatedBy: admin.id },
    });

    await auditLog({ actorId: admin.id, action: "content.update", entityType: "StaticPage", entityId: page.id });
    revalidatePath(`/help/${slug}`);

    return NextResponse.json({ page });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
