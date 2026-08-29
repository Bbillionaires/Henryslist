import { NextRequest, NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/rbac";
import { sendMessageSchema } from "@/lib/validation/messaging";
import { sendMessage, MessagingError } from "@/lib/messaging";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser();

    const ip = clientIp(req.headers);
    const { success } = await rateLimit(`send-message:${user.id}:${ip}`, RATE_LIMITS.SEND_MESSAGE.limit, RATE_LIMITS.SEND_MESSAGE.windowSeconds);
    if (!success) return NextResponse.json({ error: "You're sending messages too quickly. Please slow down." }, { status: 429 });

    const json = await req.json().catch(() => null);
    const parsed = sendMessageSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

    const message = await sendMessage(id, user.id, parsed.data.body);
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof MessagingError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
