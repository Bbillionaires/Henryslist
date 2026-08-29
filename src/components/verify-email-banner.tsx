"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast";

export function VerifyEmailBanner() {
  const { data: session } = useSession();
  const { push } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!session?.user || session.user.verified) return null;

  async function resend() {
    setSending(true);
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setSending(false);
    if (res.ok) {
      setSent(true);
      push("Verification email sent.", "success");
    }
  }

  return (
    <div className="mb-6 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span>Verify your email to post listings and message sellers.</span>
      <button onClick={resend} disabled={sending || sent} className="font-semibold underline disabled:opacity-50">
        {sent ? "Sent!" : sending ? "Sending…" : "Resend email"}
      </button>
    </div>
  );
}
