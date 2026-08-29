"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui/card";
import { formatCents } from "@/lib/format";

interface PaymentRow {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  createdAt: string;
  listing: { title: string; slug: string } | null;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/payments")
      .then((res) => res.json())
      .then((data) => setPayments(data.payments ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No payments yet.</p>
      ) : (
        <Card className="mt-6 divide-y divide-slate-100">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                {p.listing ? (
                  <Link href={`/listings/${p.listing.slug}`} className="font-medium text-slate-800 hover:underline">
                    {p.listing.title}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-800">Listing removed</span>
                )}
                <p className="text-xs text-slate-400">
                  {p.type === "NEW_LISTING" ? "New listing fee" : "Renewal"} · {new Date(p.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">{formatCents(p.amountCents)}</p>
                <Badge
                  tone={p.status === "SUCCEEDED" ? "success" : p.status === "FAILED" ? "danger" : p.status === "REFUNDED" ? "warning" : "default"}
                >
                  {p.status}
                </Badge>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
