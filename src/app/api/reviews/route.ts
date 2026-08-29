import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedUser, HttpError } from "@/lib/rbac";
import { createReviewSchema } from "@/lib/validation/review";
import { notify } from "@/lib/notifications";
import { emailTemplates } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    const json = await req.json().catch(() => null);
    const parsed = createReviewSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    const { revieweeId, listingId, rating, body } = parsed.data;

    if (revieweeId === user.id) return NextResponse.json({ error: "You can't review yourself." }, { status: 400 });

    // Require a real prior interaction — a message thread about this listing
    // between these two users — so reviews can't be posted about strangers.
    const hadConversation = await prisma.conversation.findFirst({
      where: {
        listingId: listingId ?? undefined,
        OR: [
          { buyerId: user.id, sellerId: revieweeId },
          { buyerId: revieweeId, sellerId: user.id },
        ],
      },
    });
    if (!hadConversation) {
      return NextResponse.json({ error: "You can only review someone after messaging them about a listing." }, { status: 403 });
    }

    const existing = await prisma.review.findFirst({
      where: { reviewerId: user.id, revieweeId, listingId: listingId ?? null },
    });
    if (existing) return NextResponse.json({ error: "You've already reviewed this user for this listing." }, { status: 409 });

    const review = await prisma.review.create({
      data: { reviewerId: user.id, revieweeId, listingId, rating, body },
    });

    const template = emailTemplates.reviewReceived(user.name ?? "A user", rating);
    await notify({
      userId: revieweeId,
      type: "REVIEW_RECEIVED",
      title: `${user.name ?? "A user"} left you a ${rating}-star review`,
      body: body ?? "",
      link: "/dashboard/settings",
      email: template,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
