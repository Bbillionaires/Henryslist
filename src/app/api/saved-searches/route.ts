import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { createSavedSearchSchema } from "@/lib/validation/saved-search";

export async function GET() {
  try {
    const user = await requireUser();
    const savedSearches = await prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ savedSearches });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    const parsed = createSavedSearchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const count = await prisma.savedSearch.count({ where: { userId: user.id } });
    if (count >= 25) return NextResponse.json({ error: "You've reached the limit of 25 saved searches." }, { status: 400 });

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        query: parsed.data.query,
        notifyByEmail: parsed.data.notifyByEmail,
      },
    });
    return NextResponse.json({ savedSearch }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
