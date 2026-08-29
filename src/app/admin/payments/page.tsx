"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/format";

interface AdminPaymentRow {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  createdAt: string;
  user: { name: string | null; email: string | null };
  listing: { title: string; slug: string } | null;
}

export default function AdminPaymentsPage() {
  const { push } = useToast();
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const res = await fetch(`/api/admin/payments?${params.toString()}`);
    const data = await res.json();
    if (res.ok) setPayments(data.payments);
    setLoading(false);
  }, [status, type]);

  useEffect(() => {
    load();
  }, [load]);

  async function refund(id: string) {
    const reason = window.prompt("Reason for refund:") ?? undefined;
    const res = await fetch(`/api/admin/payments/${id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Refunded", "success");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <div className="flex gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="">All statuses</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40">
            <option value="">All types</option>
            <option value="NEW_LISTING">New listing</option>
            <option value="RENEWAL">Renewal</option>
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
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Listing</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.user.name ?? p.user.email}</td>
                  <td className="px-4 py-3">
                    {p.listing ? (
                      <Link href={`/listings/${p.listing.slug}`} className="hover:underline">
                        {p.listing.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{p.type === "NEW_LISTING" ? "New listing" : "Renewal"}</td>
                  <td className="px-4 py-3 font-medium">{formatCents(p.amountCents)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.status === "SUCCEEDED" ? "success" : p.status === "FAILED" ? "danger" : p.status === "REFUNDED" ? "warning" : "default"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "SUCCEEDED" && (
                      <Button size="sm" variant="danger" onClick={() => refund(p.id)}>
                        Refund
                      </Button>
                    )}
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
