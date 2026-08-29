"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/card";

interface ConversationListItem {
  id: string;
  listing: { id: string; title: string; slug: string; images: { thumbnailUrl: string }[] } | null;
  buyer: { id: string; name: string | null; image: string | null };
  seller: { id: string; name: string | null; image: string | null };
  messages: { body: string; createdAt: string; senderId: string }[];
  unreadCount: number;
  updatedAt: string;
}

export default function MessagesListPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading messages…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
      {conversations.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No conversations yet. Contact a seller to get started.</p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {conversations.map((c) => {
            const other = c.buyer.id === session?.user?.id ? c.seller : c.buyer;
            const lastMessage = c.messages[0];
            return (
              <li key={c.id}>
                <Link href={`/dashboard/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {c.listing?.images[0] && <Image src={c.listing.images[0].thumbnailUrl} alt="" fill unoptimized className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{other.name ?? "User"}</p>
                      {c.unreadCount > 0 && <Badge tone="success">{c.unreadCount} new</Badge>}
                    </div>
                    {c.listing && <p className="truncate text-xs text-slate-400">{c.listing.title}</p>}
                    {lastMessage && <p className="mt-0.5 truncate text-sm text-slate-500">{lastMessage.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
