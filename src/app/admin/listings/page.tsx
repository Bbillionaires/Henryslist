"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input, Select } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { LISTING_STATUS_LABELS } from "@/lib/constants";
import { formatCents } from "@/lib/format";

interface AdminListingRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  priceCents: number | null;
  seller: { id: string; name: string | null; email: string | null };
  category: { name: string };
  createdAt: string;
  _count: { reports: number };
}

export default function AdminListingsPage() {
  const { push } = useToast();
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/listings?${params.toString()}`);
    const data = await res.json();
    if (res.ok) setListings(data.listings);
    setLoading(false);
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "remove" | "restore") {
    let reason: string | undefined;
    if (action === "reject" || action === "remove") {
      reason = window.prompt("Reason (shown to the seller):") ?? undefined;
      if (reason === undefined) return;
    }
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Updated", "success");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Listings</h1>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title…" className="w-56" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="">All statuses</option>
            {Object.entries(LISTING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2">Listing</th>
                <th className="px-4 py-2">Seller</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Reports</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <Link href={`/listings/${l.slug}`} className="font-medium text-slate-800 hover:underline">
                      {l.title}
                    </Link>
                    <div className="text-xs text-slate-400">{l.category.name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{l.seller.name ?? l.seller.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={l.status === "ACTIVE" ? "success" : l.status === "FLAGGED" || l.status === "REJECTED" ? "danger" : "default"}>
                      {LISTING_STATUS_LABELS[l.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{l.priceCents != null ? formatCents(l.priceCents) : "—"}</td>
                  <td className="px-4 py-3">{l._count.reports > 0 ? <Badge tone="danger">{l._count.reports}</Badge> : 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(l.status === "FLAGGED" || l.status === "PENDING_PAYMENT") && (
                        <Button size="sm" variant="outline" onClick={() => act(l.id, "approve")}>
                          Approve
                        </Button>
                      )}
                      {l.status !== "REMOVED" && l.status !== "REJECTED" && (
                        <Button size="sm" variant="danger" onClick={() => act(l.id, "remove")}>
                          Remove
                        </Button>
                      )}
                      {(l.status === "REMOVED" || l.status === "REJECTED" || l.status === "FLAGGED") && (
                        <Button size="sm" variant="outline" onClick={() => act(l.id, "restore")}>
                          Restore
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
