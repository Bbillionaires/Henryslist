"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { LocationSelector, useSavedLocation } from "@/components/location-selector";
import { LinkButton } from "@/components/ui/button";

export function HomepageHero({ tagline, subtitle }: { tagline: string; subtitle: string }) {
  const router = useRouter();
  const { location } = useSavedLocation();
  const [query, setQuery] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location && /^\d{5}$/.test(location)) params.set("zip", location);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <section className="border-b border-slate-100 bg-gradient-to-b from-emerald-50 to-white py-16">
      <div className="container-page text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{tagline}</h1>
        <p className="mt-3 text-lg text-slate-500">{subtitle}</p>

        <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-full border border-slate-200 bg-white p-2 shadow-sm">
          <Search className="ml-3 shrink-0 text-slate-400" size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="w-full bg-transparent px-2 py-2 text-base focus:outline-none"
          />
          <button type="submit" className="shrink-0 rounded-full bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700">
            Search
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-3">
          <LocationSelector />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/post" size="lg">
            Post a Listing — $1
          </LinkButton>
          <span className="text-sm font-medium text-slate-500">$1 to post · Live for 45 days</span>
        </div>
      </div>
    </section>
  );
}
