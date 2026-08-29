"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Input, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { RADIUS_OPTIONS, CONDITION_LABELS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import type { CategoryWithSubcategories } from "@/lib/categories";

export function SearchFilters({
  categories,
  params,
}: {
  categories: CategoryWithSubcategories[];
  params: Record<string, string | undefined>;
}) {
  const { status } = useSession();
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const selectedCategory = categories.find((c) => c.slug === params.category);

  async function saveSearch() {
    const name = window.prompt("Name this saved search", params.q || selectedCategory?.name || "My search");
    if (!name) return;
    setSaving(true);
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, query: params }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      push(data.error ?? "Could not save search.", "error");
      return;
    }
    push("Search saved! We'll email you when new listings match.", "success");
  }

  return (
    <form method="get" action="/search" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <Label htmlFor="q">Keyword</Label>
        <Input id="q" name="q" defaultValue={params.q} placeholder="Search…" />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select id="category" name="category" defaultValue={params.category ?? ""}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div>
          <Label htmlFor="subcategory">Subcategory</Label>
          <Select id="subcategory" name="subcategory" defaultValue={params.subcategory ?? ""}>
            <option value="">All</option>
            {selectedCategory.subcategories.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="minPrice">Price range</Label>
        <div className="flex items-center gap-2">
          <Input id="minPrice" name="minPrice" type="number" min={0} placeholder="Min" defaultValue={params.minPrice} aria-label="Minimum price" />
          <span className="text-slate-400" aria-hidden="true">
            –
          </span>
          <Input name="maxPrice" type="number" min={0} placeholder="Max" defaultValue={params.maxPrice} aria-label="Maximum price" />
        </div>
      </div>

      <div>
        <Label htmlFor="condition">Condition</Label>
        <Select id="condition" name="condition" defaultValue={params.condition ?? ""}>
          <option value="">Any</option>
          {Object.entries(CONDITION_LABELS)
            .filter(([k]) => k !== "NOT_APPLICABLE")
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="zip">ZIP code</Label>
        <Input id="zip" name="zip" defaultValue={params.zip} placeholder="e.g. 78701" />
      </div>

      <div>
        <Label htmlFor="radius">Distance</Label>
        <Select id="radius" name="radius" defaultValue={params.radius ?? ""}>
          <option value="">Anywhere</option>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              Within {r} miles
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="datePosted">Date posted</Label>
        <Select id="datePosted" name="datePosted" defaultValue={params.datePosted ?? "any"}>
          <option value="any">Any time</option>
          <option value="24h">Last 24 hours</option>
          <option value="week">Last week</option>
          <option value="month">Last month</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="sort">Sort by</Label>
        <Select id="sort" name="sort" defaultValue={params.sort ?? "newest"}>
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="distance">Distance</option>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit" className="w-full">
          Apply filters
        </Button>
        {status === "authenticated" && (
          <Button type="button" variant="outline" className="w-full" onClick={saveSearch} disabled={saving}>
            <Bookmark size={16} /> Save this search
          </Button>
        )}
      </div>
    </form>
  );
}
