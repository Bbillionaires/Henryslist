"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Label, Input, Select, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WizardSteps } from "@/components/listing-wizard-steps";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/format";
import type { CategoryWithSubcategories } from "@/lib/categories";

export function PostStepOne({ categories }: { categories: CategoryWithSubcategories[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subcategories = useMemo(() => categories.find((c) => c.id === categoryId)?.subcategories ?? [], [categories, categoryId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) return setError("Choose a category to continue.");
    setLoading(true);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        subcategoryId: subcategoryId || null,
        location: { country: "US", city, state, zip },
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    push("Draft created — let's add the details.", "success");
    router.push(`/post/${data.listing.id}/details`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <WizardSteps current={1} />
      <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <strong>{formatCents(100)} to post — live for 45 days.</strong> No subscriptions, ever.
      </div>

      <h1 className="text-2xl font-bold text-slate-900">What are you posting?</h1>
      <p className="mt-1 text-sm text-slate-500">Choose a category and where it&apos;s located.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div>
          <Label htmlFor="category" required>Category</Label>
          <Select
            id="category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId("");
            }}
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {subcategories.length > 0 && (
          <div>
            <Label htmlFor="subcategory">Subcategory</Label>
            <Select id="subcategory" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>
              <option value="">Select a subcategory (optional)…</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Austin" />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" maxLength={2} />
          </div>
        </div>
        <div>
          <Label htmlFor="zip">ZIP code</Label>
          <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="78701" />
          <FieldError>{undefined}</FieldError>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
