import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";

export function SellerCard({
  seller,
  ratingSummary,
}: {
  seller: { id: string; name: string | null; createdAt: Date; profile?: { displayName: string | null; avatarUrl: string | null } | null };
  ratingSummary?: { average: number; count: number } | null;
}) {
  const name = seller.profile?.displayName || seller.name || "Henry's List user";
  return (
    <Link href={`/sellers/${seller.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
        {seller.profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seller.profile.avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <User size={22} />
        )}
      </div>
      <div>
        <p className="font-semibold text-slate-900">{name}</p>
        <p className="text-xs text-slate-400">Member since {formatDistanceToNow(seller.createdAt, { addSuffix: true })}</p>
        {ratingSummary && ratingSummary.count > 0 && (
          <p className="text-xs text-amber-600">
            ★ {ratingSummary.average.toFixed(1)} ({ratingSummary.count} review{ratingSummary.count === 1 ? "" : "s"})
          </p>
        )}
      </div>
    </Link>
  );
}
