"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/settings";
import { LISTING_STATUS_LABELS } from "@/lib/constants";
import { Eye, MessageCircle, Heart, Pencil, PauseCircle, PlayCircle, Trash2, RefreshCw } from "lucide-react";

interface DashboardListing {
  id: string;
  title: string;
  slug: string;
  status: string;
  priceCents: number | null;
  isFree: boolean;
  viewCount: number;
  messageCount: number;
  favoriteCount: number;
  createdAt: string;
  expiresAt: string | null;
  images: { thumbnailUrl: string }[];
}

const TABS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Drafts", value: "DRAFT" },
  { label: "Paused", value: "PAUSED" },
  { label: "Expired", value: "EXPIRED" },
];

function ListingsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { push } = useToast();
  const status = searchParams.get("status") ?? "";
  const [listings, setListings] = useState<DashboardListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dashboard/listings");
    const data = await res.json();
    if (res.ok) setListings(data.listings);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = status ? listings.filter((l) => l.status === status) : listings;

  async function pause(id: string) {
    const res = await fetch(`/api/listings/${id}/pause`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Listing paused", "success");
    load();
  }

  async function resume(id: string) {
    const res = await fetch(`/api/listings/${id}/resume`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Listing resumed", "success");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Listing deleted", "success");
    load();
  }

  async function renew(id: string) {
    const res = await fetch(`/api/listings/${id}/renew/checkout`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    window.location.href = data.url;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Listings</h1>
        <Link href="/post">
          <Button>Post a listing — $1</Button>
        </Link>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => router.push(`/dashboard/listings${tab.value ? `?status=${tab.value}` : ""}`)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              status === tab.value ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No listings here yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((l) => (
            <Card key={l.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {l.images[0] && <Image src={l.images[0].thumbnailUrl} alt="" fill unoptimized className="object-cover" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/listings/${l.slug}`} className="font-semibold text-slate-800 hover:underline">
                    {l.title}
                  </Link>
                  <Badge tone={l.status === "ACTIVE" ? "success" : l.status === "EXPIRED" ? "warning" : "default"}>
                    {LISTING_STATUS_LABELS[l.status]}
                  </Badge>
                </div>
                <p className="text-sm text-emerald-700">{l.isFree ? "Free" : l.priceCents != null ? formatCents(l.priceCents) : "—"}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Eye size={12} /> {l.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={12} /> {l.messageCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} /> {l.favoriteCount}
                  </span>
                  <span>Posted {new Date(l.createdAt).toLocaleDateString()}</span>
                  {l.expiresAt && <span>Expires {new Date(l.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {l.status === "DRAFT" && (
                  <Link href={`/post/${l.id}/details`}>
                    <Button size="sm" variant="outline">
                      <Pencil size={14} /> Continue
                    </Button>
                  </Link>
                )}
                {(l.status === "ACTIVE" || l.status === "PAUSED") && (
                  <Link href={`/post/${l.id}/details`}>
                    <Button size="sm" variant="outline">
                      <Pencil size={14} /> Edit
                    </Button>
                  </Link>
                )}
                {l.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" onClick={() => pause(l.id)}>
                    <PauseCircle size={14} /> Pause
                  </Button>
                )}
                {l.status === "PAUSED" && (
                  <Button size="sm" variant="outline" onClick={() => resume(l.id)}>
                    <PlayCircle size={14} /> Resume
                  </Button>
                )}
                {l.status === "EXPIRED" && (
                  <Button size="sm" onClick={() => renew(l.id)}>
                    <RefreshCw size={14} /> Renew for $1
                  </Button>
                )}
                {l.status !== "REMOVED" && (
                  <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardListingsPage() {
  return (
    <Suspense>
      <ListingsView />
    </Suspense>
  );
}
