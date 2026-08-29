import { clientEnv } from "@/lib/env";

function layout(title: string, bodyHtml: string, ctaText?: string, ctaUrl?: string): string {
  const cta =
    ctaText && ctaUrl
      ? `<tr><td style="padding:24px 0 0"><a href="${ctaUrl}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block">${ctaText}</a></td></tr>`
      : "";
  return `<!doctype html>
<html>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px">
        <tr><td style="font-size:20px;font-weight:700;padding-bottom:16px">${clientEnv.NEXT_PUBLIC_SITE_NAME}</td></tr>
        <tr><td style="font-size:18px;font-weight:600;padding-bottom:12px">${title}</td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#3f3f46">${bodyHtml}</td></tr>
        ${cta}
        <tr><td style="padding-top:32px;font-size:12px;color:#a1a1aa">You're receiving this because of activity on your ${clientEnv.NEXT_PUBLIC_SITE_NAME} account. Manage preferences in Account Settings.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const appUrl = () => clientEnv.NEXT_PUBLIC_APP_URL;

export const emailTemplates = {
  verifyEmail: (token: string) => ({
    subject: `Verify your email — ${clientEnv.NEXT_PUBLIC_SITE_NAME}`,
    html: layout(
      "Confirm your email address",
      "Welcome! Please confirm your email address to finish setting up your account and start posting listings.",
      "Verify email",
      `${appUrl()}/verify-email?token=${token}`,
    ),
  }),
  passwordReset: (token: string) => ({
    subject: `Reset your password — ${clientEnv.NEXT_PUBLIC_SITE_NAME}`,
    html: layout(
      "Reset your password",
      "We received a request to reset your password. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
      "Reset password",
      `${appUrl()}/reset-password?token=${token}`,
    ),
  }),
  listingPublished: (listingTitle: string, listingId: string, expiresAt: Date) => ({
    subject: `Your listing is live: ${listingTitle}`,
    html: layout(
      "Your listing is live!",
      `<strong>${listingTitle}</strong> is now active and visible to buyers. It will run for 45 days and expire on <strong>${expiresAt.toLocaleDateString()}</strong>.`,
      "View listing",
      `${appUrl()}/listings/${listingId}`,
    ),
  }),
  paymentReceipt: (amountLabel: string, listingTitle: string, listingId: string) => ({
    subject: `Receipt: ${amountLabel} — ${listingTitle}`,
    html: layout(
      "Payment receipt",
      `We received your payment of <strong>${amountLabel}</strong> for the listing "${listingTitle}". This receipt is also available in your Payment History.`,
      "View listing",
      `${appUrl()}/listings/${listingId}`,
    ),
  }),
  paymentFailed: (listingTitle: string) => ({
    subject: `Payment failed for ${listingTitle}`,
    html: layout(
      "Payment failed",
      `Your payment for "${listingTitle}" did not go through, so the listing has not been published. You can try again anytime from your dashboard.`,
      "Try again",
      `${appUrl()}/dashboard/listings`,
    ),
  }),
  newMessage: (senderName: string, listingTitle: string | null, conversationId: string) => ({
    subject: `New message from ${senderName}`,
    html: layout(
      "You have a new message",
      `${senderName} sent you a message${listingTitle ? ` about "${listingTitle}"` : ""}.`,
      "Reply",
      `${appUrl()}/dashboard/messages/${conversationId}`,
    ),
  }),
  listingExpiringSoon: (listingTitle: string, listingId: string, daysLeft: number) => ({
    subject: `Your listing expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}: ${listingTitle}`,
    html: layout(
      "Your listing is expiring soon",
      `"${listingTitle}" will expire in <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>. Renew for $1 to keep it live for another 45 days.`,
      "Manage listing",
      `${appUrl()}/listings/${listingId}`,
    ),
  }),
  listingExpired: (listingTitle: string, listingId: string) => ({
    subject: `Your listing has expired: ${listingTitle}`,
    html: layout(
      "Your listing has expired",
      `"${listingTitle}" is no longer visible to buyers. Renew it for $1 to keep selling for another 45 days.`,
      "Renew for $1",
      `${appUrl()}/listings/${listingId}`,
    ),
  }),
  listingRenewed: (listingTitle: string, listingId: string, expiresAt: Date) => ({
    subject: `Renewed: ${listingTitle}`,
    html: layout(
      "Listing renewed",
      `"${listingTitle}" is active again and will now expire on <strong>${expiresAt.toLocaleDateString()}</strong>.`,
      "View listing",
      `${appUrl()}/listings/${listingId}`,
    ),
  }),
  savedSearchMatch: (searchName: string, count: number, savedSearchId: string) => ({
    subject: `${count} new listing${count === 1 ? "" : "s"} match "${searchName}"`,
    html: layout(
      "New matches for your saved search",
      `We found ${count} new listing${count === 1 ? "" : "s"} matching your saved search "${searchName}".`,
      "View results",
      `${appUrl()}/search?savedSearch=${savedSearchId}`,
    ),
  }),
  listingReported: (listingTitle: string) => ({
    subject: `A listing you reported is being reviewed`,
    html: layout(
      "Thanks for the report",
      `Thanks for reporting "${listingTitle}". Our moderation team is reviewing it.`,
    ),
  }),
  accountSecurity: (message: string) => ({
    subject: `Security alert — ${clientEnv.NEXT_PUBLIC_SITE_NAME}`,
    html: layout("Security alert", message),
  }),
  favoritePriceChange: (listingTitle: string, listingId: string, oldPrice: string, newPrice: string) => ({
    subject: `Price changed: ${listingTitle}`,
    html: layout(
      "Price change on a saved listing",
      `"${listingTitle}" changed from ${oldPrice} to <strong>${newPrice}</strong>.`,
      "View listing",
      `${appUrl()}/listings/${listingId}`,
    ),
  }),
  favoriteRemoved: (listingTitle: string) => ({
    subject: `A saved listing was removed`,
    html: layout("Saved listing removed", `"${listingTitle}" is no longer available.`),
  }),
  reviewReceived: (raterName: string, rating: number) => ({
    subject: `${raterName} left you a ${rating}-star review`,
    html: layout(
      "New review",
      `${raterName} left you a ${rating}-star review.`,
      "View profile",
      `${appUrl()}/dashboard/profile`,
    ),
  }),
};
