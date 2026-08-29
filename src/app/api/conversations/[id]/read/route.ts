import { NextRequest, NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/rbac";
import { markConversationRead, MessagingError } from "@/lib/messaging";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();
    await markConversationRead(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof MessagingError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
