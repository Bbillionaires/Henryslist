"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

interface StaticPageRow {
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
}

export default function AdminContentPage() {
  const [pages, setPages] = useState<StaticPageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((res) => res.json())
      .then((data) => setPages(data.pages ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Content Pages</h1>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <Card className="divide-y divide-slate-100">
          {pages.map((p) => (
            <Link key={p.id} href={`/admin/content/${p.slug}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-800">{p.title}</p>
                <p className="text-xs text-slate-400">/help/{p.slug}</p>
              </div>
              <span className="text-xs text-slate-400">Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
