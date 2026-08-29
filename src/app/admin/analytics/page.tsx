"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

const LABELS: Record<string, string> = {
  listing_created: "Listings created",
  listing_paid: "Listings successfully paid",
  search: "Searches",
  contact_seller_click: "Contact-seller clicks",
  message_sent: "Messages sent",
  favorite: "Favorites",
  renewal: "Renewals",
  report_filed: "Reports filed",
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<{ counts: { type: string; count: number }[]; conversionRate: number; totalViews30d: number } | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Last 30 days</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.counts
          .filter((c) => LABELS[c.type])
          .map((c) => (
            <Card key={c.type} className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{LABELS[c.type]}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{c.count.toLocaleString()}</p>
            </Card>
          ))}
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Listing views</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data.totalViews30d.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Draft → paid conversion</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{(data.conversionRate * 100).toFixed(1)}%</p>
        </Card>
      </div>
    </div>
  );
}
