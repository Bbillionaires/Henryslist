"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface AdminReviewRow {
  id: string;
  rating: number;
  body: string | null;
  status: string;
  createdAt: string;
  reviewer: { name: string | null; email: string | null };
  reviewee: { id: string; name: string | null; email: string | null };
  _count: { reports: number };
}

export default function AdminReviewsPage() {
  const { push } = useToast();
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/reviews");
    const data = await res.json();
    if (res.ok) setReviews(data.reviews);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "remove" | "restore") {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Updated", "success");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">{"★".repeat(r.rating)}</span>
                    <Badge tone={r.status === "PUBLISHED" ? "success" : "danger"}>{r.status}</Badge>
                    {r._count.reports > 0 && <Badge tone="danger">{r._count.reports} report(s)</Badge>}
                  </div>
                  {r.body && <p className="mt-1 text-sm text-slate-700">{r.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {r.reviewer.name ?? r.reviewer.email} reviewed{" "}
                    <Link href={`/sellers/${r.reviewee.id}`} className="hover:underline">
                      {r.reviewee.name ?? r.reviewee.email}
                    </Link>{" "}
                    · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {r.status === "PUBLISHED" ? (
                  <Button size="sm" variant="danger" onClick={() => act(r.id, "remove")}>
                    Remove
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => act(r.id, "restore")}>
                    Restore
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
