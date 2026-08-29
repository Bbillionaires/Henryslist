"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import clsx from "clsx";

export function FavoriteButton({ listingId }: { listingId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        const ids = new Set((data.favorites ?? []).map((f: { listingId: string }) => f.listingId));
        setFavorited(ids.has(listingId));
      })
      .catch(() => {});
  }, [status, listingId]);

  async function toggle() {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    setLoading(true);
    if (favorited) {
      await fetch(`/api/favorites/${listingId}`, { method: "DELETE" });
      setFavorited(false);
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      setFavorited(true);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={clsx(
        "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
        favorited ? "border-red-200 bg-red-50 text-red-600" : "border-slate-300 text-slate-700 hover:bg-slate-50",
      )}
    >
      <Heart size={16} fill={favorited ? "currentColor" : "none"} />
      {favorited ? "Saved" : "Save"}
    </button>
  );
}
