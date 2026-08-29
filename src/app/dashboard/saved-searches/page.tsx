"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Bookmark, Trash2, Pause, Play } from "lucide-react";

interface SavedSearchRow {
  id: string;
  name: string;
  query: Record<string, string>;
  isPaused: boolean;
  notifyByEmail: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
}

export default function SavedSearchesPage() {
  const { push } = useToast();
  const [items, setItems] = useState<SavedSearchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/saved-searches");
    const data = await res.json();
    if (res.ok) setItems(data.savedSearches);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePause(id: string, isPaused: boolean) {
    await fetch(`/api/saved-searches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaused: !isPaused }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this saved search?")) return;
    const res = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    if (!res.ok) return push("Could not delete.", "error");
    load();
  }

  function searchUrl(query: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, String(v));
    return `/search?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Saved Searches</h1>
      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          No saved searches yet. Save a search from the <Link href="/search" className="text-emerald-700 underline">search page</Link>.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Bookmark size={16} className="text-emerald-600" />
                  <Link href={searchUrl(s.query)} className="font-semibold text-slate-800 hover:underline">
                    {s.name}
                  </Link>
                  {s.isPaused && <Badge tone="warning">Paused</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {s.notifyByEmail ? "Email alerts on" : "Email alerts off"}
                  {s.lastNotifiedAt && ` · Last match ${new Date(s.lastNotifiedAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePause(s.id, s.isPaused)}>
                  {s.isPaused ? <Play size={14} /> : <Pause size={14} />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
