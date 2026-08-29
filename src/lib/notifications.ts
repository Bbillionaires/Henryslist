import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import type { NotificationType } from "@prisma/client";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, unknown>;
  email?: { subject: string; html: string };
}

const PREFERENCE_MAP: Partial<Record<NotificationType, keyof PrefRow>> = {
  LISTING_PUBLISHED: "emailListingPublished",
  LISTING_EXPIRING_SOON: "emailListingExpiring",
  LISTING_EXPIRED: "emailListingExpired",
  NEW_MESSAGE: "emailNewMessage",
  SAVED_SEARCH_MATCH: "emailSavedSearchMatch",
  FAVORITE_PRICE_CHANGE: "emailPriceChange",
};

type PrefRow = {
  emailListingPublished: boolean;
  emailListingExpiring: boolean;
  emailListingExpired: boolean;
  emailNewMessage: boolean;
  emailSavedSearchMatch: boolean;
  emailPriceChange: boolean;
};

/**
 * Creates an in-app Notification row and, if the user's preferences allow it
 * for this notification type, sends the matching transactional email.
 * Security- and payment-critical types (ACCOUNT_SECURITY, PAYMENT_RECEIPT,
 * PAYMENT_FAILED, ACCOUNT_VERIFICATION, LISTING_REPORTED, LISTING_RENEWED,
 * REVIEW_RECEIVED) are always emailed regardless of preference — they are
 * not marketing and users can't opt out of security/receipt notices.
 */
export async function notify(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      data: input.data as never,
    },
  });

  if (!input.email) return notification;

  const prefKey = PREFERENCE_MAP[input.type];
  let allowed = true;
  if (prefKey) {
    const pref = await prisma.notificationPreference.findUnique({ where: { userId: input.userId } });
    allowed = pref ? pref[prefKey] : true;
  }
  if (!allowed) return notification;

  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
  if (!user?.email) return notification;

  const result = await sendEmail({ to: user.email, subject: input.email.subject, html: input.email.html });
  if (result.ok) {
    await prisma.notification.update({ where: { id: notification.id }, data: { emailSentAt: new Date() } });
  }
  return notification;
}
