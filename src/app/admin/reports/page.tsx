"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { REPORT_REASON_LABELS } from "@/lib/constants";

interface AdminReportRow {
  id: string;
  targetType: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { name: string | null; email: string | null };
  listing: { id: string; title: string; slug: string } | null;
  reportedUser: { id: string; name: string | null; email: string | null } | null;
}

export default function AdminReportsPage() {
  const { push } = useToast();
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [status, setStatus] = useState("OPEN");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?status=${status}`);
    const data = await res.json();
    if (res.ok) setReports(data.reports);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "resolve" | "dismiss") {
    const resolution = window.prompt("Resolution notes (internal):") ?? undefined;
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, resolution }),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Updated", "success");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
          <option value="OPEN">Open</option>
          <option value="IN_REVIEW">In review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="ALL">All</option>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-500">No reports here.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="danger">{REPORT_REASON_LABELS[r.reason]}</Badge>
                    <Badge>{r.targetType}</Badge>
                    <Badge tone={r.status === "OPEN" ? "warning" : "default"}>{r.status}</Badge>
                  </div>
                  {r.listing && (
                    <Link href={`/listings/${r.listing.slug}`} className="mt-1 block font-medium text-slate-800 hover:underline">
                      {r.listing.title}
                    </Link>
                  )}
                  {r.reportedUser && (
                    <Link href={`/sellers/${r.reportedUser.id}`} className="mt-1 block font-medium text-slate-800 hover:underline">
                      {r.reportedUser.name ?? r.reportedUser.email}
                    </Link>
                  )}
                  {r.details && <p className="mt-1 text-sm text-slate-600">{r.details}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    Reported by {r.reporter.name ?? r.reporter.email} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                {(r.status === "OPEN" || r.status === "IN_REVIEW") && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "dismiss")}>
                      Dismiss
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => act(r.id, "resolve")}>
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
