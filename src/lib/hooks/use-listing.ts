"use client";

import { useEffect, useState, useCallback } from "react";

export interface ListingImageDTO {
  id: string;
  url: string;
  thumbnailUrl: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ListingAttributeDTO {
  key: string;
  label: string;
  value: string;
}

export interface ListingDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number | null;
  isFree: boolean;
  condition: string;
  tags: string[];
  status: string;
  contactViaMessages: boolean;
  contactViaPhone: boolean;
  contactViaEmail: boolean;
  categoryId: string;
  subcategoryId: string | null;
  category: { id: string; name: string; slug: string };
  subcategory: { id: string; name: string; slug: string } | null;
  location: { id: string; city: string | null; state: string | null; zip: string | null; address: string | null } | null;
  images: ListingImageDTO[];
  attributes: ListingAttributeDTO[];
  publishedAt: string | null;
  expiresAt: string | null;
  sellerId: string;
}

export function useListing(id: string) {
  const [listing, setListing] = useState<ListingDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/listings/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load listing");
    } else {
      setListing(data.listing);
      setError(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { listing, loading, error, reload };
}
