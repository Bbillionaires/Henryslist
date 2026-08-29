import Link from "next/link";
import Image from "next/image";
import { ImageOff, MapPin } from "lucide-react";
import { formatCents } from "@/lib/settings";
import { CONDITION_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/card";

export interface ListingCardData {
  id: string;
  slug: string;
  title: string;
  priceCents: number | null;
  isFree: boolean;
  condition?: string;
  thumbnailUrl: string | null;
  city: string | null;
  state: string | null;
  publishedAt: Date | string | null;
  distanceMiles?: number | null;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const location = [listing.city, listing.state].filter(Boolean).join(", ");
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-slate-100">
        {listing.thumbnailUrl ? (
          <Image
            src={listing.thumbnailUrl}
            alt={listing.title}
            fill
            unoptimized
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageOff size={32} />
          </div>
        )}
        {listing.condition && listing.condition !== "NOT_APPLICABLE" && (
          <Badge className="absolute left-2 top-2 bg-white/90">{CONDITION_LABELS[listing.condition]}</Badge>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-emerald-700">{listing.isFree ? "Free" : listing.priceCents != null ? formatCents(listing.priceCents) : "Contact"}</p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-800">{listing.title}</h3>
        {(location || listing.distanceMiles != null) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <MapPin size={12} />
            {listing.distanceMiles != null ? `${listing.distanceMiles.toFixed(1)} mi away` : location}
          </p>
        )}
      </div>
    </Link>
  );
}
