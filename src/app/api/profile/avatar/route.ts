import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/rbac";
import { processAvatarImage } from "@/lib/images";
import { ALLOWED_MIME_TYPES } from "@/lib/images";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const ip = clientIp(req.headers);
    const { success } = await rateLimit(`upload-avatar:${user.id}:${ip}`, RATE_LIMITS.UPLOAD_IMAGE.limit, RATE_LIMITS.UPLOAD_IMAGE.windowSeconds);
    if (!success) return NextResponse.json({ error: "Too many uploads. Please slow down." }, { status: 429 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Use JPEG, PNG, WEBP, or HEIC." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const avatar = await processAvatarImage(buffer);

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, avatarUrl: avatar.url },
      update: { avatarUrl: avatar.url },
    });
    await prisma.user.update({ where: { id: user.id }, data: { image: avatar.url } });

    return NextResponse.json({ url: avatar.url });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
