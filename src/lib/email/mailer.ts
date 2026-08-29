import "server-only";
import { env } from "@/lib/env";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let nodemailerTransport: import("nodemailer").Transporter | null = null;
let resendClient: import("resend").Resend | null = null;

async function getNodemailerTransport() {
  if (nodemailerTransport) return nodemailerTransport;
  const nodemailer = await import("nodemailer");
  nodemailerTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  return nodemailerTransport;
}

async function getResendClient() {
  if (resendClient) return resendClient;
  const { Resend } = await import("resend");
  resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

/**
 * Sends a transactional email through the configured provider. Never throws
 * on provider failure by default (email delivery must not break the caller's
 * business transaction, e.g. a Stripe webhook) — failures are logged.
 * Callers that must know delivery succeeded can inspect the return value.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  try {
    if (env.EMAIL_PROVIDER === "console" || process.env.NODE_ENV === "test") {
      console.log(`\n--- EMAIL (console provider) ---\nTo: ${input.to}\nSubject: ${input.subject}\n${input.text ?? input.html}\n---------------------------------\n`);
      return { ok: true };
    }

    if (env.EMAIL_PROVIDER === "resend") {
      const client = await getResendClient();
      const res = await client.emails.send({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      });
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true };
    }

    // smtp
    const transport = await getNodemailerTransport();
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (err) {
    console.error("sendEmail failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
