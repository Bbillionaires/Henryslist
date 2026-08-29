"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function PreviewActions({ listingId, priceLabel }: { listingId: string; priceLabel: string }) {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    const res = await fetch(`/api/listings/${listingId}/checkout`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      push(data.error ?? "Could not start checkout.", "error");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <Button className="flex-1" size="lg" onClick={checkout} disabled={loading}>
      {loading ? "Redirecting…" : `Continue to payment — ${priceLabel}`}
    </Button>
  );
}
