"use client";

import { useEffect, useState } from "react";
import { ListingCard } from "@/components/listing-card";

interface FavoriteRow {
  id: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    priceCents: number | null;
    isFree: boolean;
    publishedAt: string | null;
    images: { thumbnailUrl: string }[];
    location: { city: string | null; state: string | null } | null;
  };
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => setFavorites(data.favorites ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : favorites.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">You haven&apos;t saved any listings yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((f) => (
            <ListingCard
              key={f.id}
              listing={{
                id: f.listing.id,
                slug: f.listing.slug,
                title: f.listing.title,
                priceCents: f.listing.priceCents,
                isFree: f.listing.isFree,
                thumbnailUrl: f.listing.images[0]?.thumbnailUrl ?? null,
                city: f.listing.location?.city ?? null,
                state: f.listing.location?.state ?? null,
                publishedAt: f.listing.publishedAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
