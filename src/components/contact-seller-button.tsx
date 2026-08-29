"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { MessageCircle, X } from "lucide-react";

export function ContactSellerButton({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const { status } = useSession();
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(`Hi, is "${listingTitle}" still available?`);
  const [sending, setSending] = useState(false);

  function openModal() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/listings`);
      return;
    }
    setOpen(true);
  }

  async function send() {
    setSending(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, message }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      push(data.error ?? "Could not send message.", "error");
      return;
    }
    setOpen(false);
    router.push(`/dashboard/messages/${data.conversation.id}`);
  }

  return (
    <>
      <Button size="lg" className="w-full" onClick={openModal}>
        <MessageCircle size={18} /> Contact Seller
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Message the seller</h2>
              <button onClick={() => setOpen(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            <Button className="mt-3 w-full" onClick={send} disabled={sending || !message.trim()}>
              {sending ? "Sending…" : "Send message"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
