"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function EditContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/content/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.page) {
          setTitle(data.page.title);
          setBody(data.page.body);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/content/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return push(data.error, "error");
    push("Saved", "success");
    router.push("/admin/content");
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Edit /help/{slug}</h1>
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>Body (HTML)</Label>
        <Textarea rows={20} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
        <p className="mt-1 text-xs text-slate-400">Supports basic HTML tags: h2, p, ul, li, strong, a.</p>
      </div>
      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
