import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getRatingSummary } from "@/lib/reviews";
import { ListingCard } from "@/components/listing-card";
import { ReportButton } from "@/components/report-button";
import { User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, include: { profile: true } });
  if (!user) return {};
  return { title: user.profile?.displayName || user.name || "Seller profile" };
}

export default async function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seller = await prisma.user.findUnique({
    where: { id },
    include: { profile: { include: { location: true } } },
  });
  if (!seller || seller.status === "DELETED" || seller.status === "BANNED") notFound();
  if (seller.profile && seller.profile.isPublic === false) notFound();

  const [listings, ratingSummary, reviews] = await Promise.all([
    prisma.listing.findMany({
      where: { sellerId: id, status: "ACTIVE" },
      orderBy: { publishedAt: "desc" },
      include: { images: { where: { isPrimary: true }, take: 1 }, location: { select: { city: true, state: true } } },
    }),
    getRatingSummary(id),
    prisma.review.findMany({
      where: { revieweeId: id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { reviewer: { select: { name: true } } },
    }),
  ]);

  const name = seller.profile?.displayName || seller.name || "Henry's List user";
  const location = [seller.profile?.location?.city, seller.profile?.location?.state].filter(Boolean).join(", ");

  return (
    <div className="container-page py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
            {seller.profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seller.profile.avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <User size={36} />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{name}</h1>
            {location && <p className="text-sm text-slate-500">{location}</p>}
            <p className="text-sm text-slate-400">Member since {formatDistanceToNow(seller.createdAt, { addSuffix: true })}</p>
            {ratingSummary.count > 0 && (
              <p className="text-sm text-amber-600">
                ★ {ratingSummary.average.toFixed(1)} ({ratingSummary.count} review{ratingSummary.count === 1 ? "" : "s"})
              </p>
            )}
          </div>
        </div>
        <ReportButton targetType="USER" targetId={seller.id} />
      </div>

      <h2 className="mb-4 mt-10 text-lg font-bold text-slate-900">{listings.length} active listing{listings.length === 1 ? "" : "s"}</h2>
      {listings.length === 0 ? (
        <p className="text-sm text-slate-500">No active listings right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={{
                id: l.id,
                slug: l.slug,
                title: l.title,
                priceCents: l.priceCents,
                isFree: l.isFree,
                thumbnailUrl: l.images[0]?.thumbnailUrl ?? null,
                city: l.location?.city ?? null,
                state: l.location?.state ?? null,
                publishedAt: l.publishedAt,
              }}
            />
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Reviews</h2>
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{r.reviewer.name ?? "User"}</span>
                  <span className="text-amber-600">{"★".repeat(r.rating)}</span>
                </div>
                {r.body && <p className="mt-1 text-sm text-slate-600">{r.body}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
