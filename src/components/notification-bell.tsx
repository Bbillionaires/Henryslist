"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [status, load]);

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    load();
  }

  async function openItem(item: NotificationItem) {
    if (!item.readAt) {
      await fetch(`/api/notifications/${item.id}/read`, { method: "POST" });
      load();
    }
  }

  if (status !== "authenticated") return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg" onMouseLeave={() => setOpen(false)}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-emerald-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => openItem(n)}
                  className={clsx("block border-b border-slate-50 px-4 py-3 hover:bg-slate-50", !n.readAt && "bg-emerald-50/50")}
                >
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
