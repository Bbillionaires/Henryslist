"use client";

import { useEffect, useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function AdminSettingsPage() {
  const { push } = useToast();
  const [priceDollars, setPriceDollars] = useState("1.00");
  const [durationDays, setDurationDays] = useState("45");
  const [tagline, setTagline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [featured, setFeatured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        const s = data.settings;
        if (!s) return;
        setPriceDollars((s.listing_price_cents / 100).toFixed(2));
        setDurationDays(String(s.listing_duration_days));
        setTagline(s.homepage_tagline);
        setSubtitle(s.homepage_subtitle);
        setFeatured(s.featured_listings_enabled);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_price_cents: Math.round(parseFloat(priceDollars) * 100),
        listing_duration_days: parseInt(durationDays, 10),
        homepage_tagline: tagline,
        homepage_subtitle: subtitle,
        featured_listings_enabled: featured,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return push(data.error, "error");
    push("Settings saved", "success");
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Pricing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Listing price (USD)</Label>
            <Input type="number" min={0} step="0.01" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} />
          </div>
          <div>
            <Label>Duration (days)</Label>
            <Input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-400">Changing these only affects listings posted or renewed after saving.</p>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Homepage</h2>
        <div>
          <Label>Tagline</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Show featured listings section
        </label>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
