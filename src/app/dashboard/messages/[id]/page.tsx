"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ShieldOff, Flag } from "lucide-react";
import clsx from "clsx";

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}
interface ConversationDetail {
  id: string;
  status: string;
  listing: { id: string; title: string; slug: string } | null;
  buyer: { id: string; name: string | null };
  seller: { id: string; name: string | null };
  messages: Message[];
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { push } = useToast();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    if (res.ok) {
      setConversation(data.conversation);
      fetch(`/api/conversations/${id}/read`, { method: "POST" });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) return push(data.error ?? "Could not send message.", "error");
    setDraft("");
    load();
  }

  async function block() {
    if (!confirm("Block this user? You won't be able to message each other anymore.")) return;
    const res = await fetch(`/api/conversations/${id}/block`, { method: "POST" });
    if (res.ok) {
      push("User blocked.", "success");
      load();
    }
  }

  async function report() {
    const reason = window.prompt("Why are you reporting this conversation? (spam, harassment, scam, other)");
    if (!reason) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "CONVERSATION", conversationId: id, reason: "OTHER", details: reason }),
    });
    push("Report submitted. Our team will review it.", "success");
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!conversation) return <p className="text-sm text-red-600">Conversation not found.</p>;

  const otherName = conversation.buyer.id === session?.user?.id ? conversation.seller.name : conversation.buyer.name;
  const isBlocked = conversation.status === "BLOCKED";

  return (
    <div className="flex h-[75vh] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <h1 className="font-semibold text-slate-900">{otherName ?? "User"}</h1>
          {conversation.listing && (
            <Link href={`/listings/${conversation.listing.slug}`} className="text-xs text-emerald-700 hover:underline">
              {conversation.listing.title}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={report} title="Report" className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Flag size={16} />
          </button>
          <button onClick={block} title="Block" className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
            <ShieldOff size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {conversation.messages.map((m) => {
          const mine = m.senderId === session?.user?.id;
          return (
            <div key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={clsx(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800",
                )}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={clsx("mt-1 text-[10px]", mine ? "text-emerald-100" : "text-slate-400")}>{format(new Date(m.createdAt), "MMM d, h:mm a")}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isBlocked ? (
        <p className="border-t border-slate-100 p-4 text-center text-sm text-slate-400">This conversation is no longer available.</p>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-4">
          <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" className="flex-1" />
          <Button type="submit" disabled={sending}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
