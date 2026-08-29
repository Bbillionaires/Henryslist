import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getListingBySlug, isPubliclyViewable, recordListingView, getSimilarListings } from "@/lib/listings/queries";
import { getCurrentUser } from "@/lib/rbac";
import { getRatingSummary } from "@/lib/reviews";
import { formatCents } from "@/lib/format";
import { clientIp } from "@/lib/rate-limit";
import { clientEnv } from "@/lib/env";
import { CONDITION_LABELS } from "@/lib/constants";
import { Gallery } from "./gallery";
import { ContactSellerButton } from "@/components/contact-seller-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { ReportButton } from "@/components/report-button";
import { SellerCard } from "@/components/seller-card";
import { ListingCard } from "@/components/listing-card";
import { Badge } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Phone, Mail } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || !isPubliclyViewable(listing.status)) return {};

  const description = listing.description.slice(0, 155);
  const image = listing.images[0]?.url;
  const url = `${clientEnv.NEXT_PUBLIC_APP_URL}/listings/${listing.slug}`;

  return {
    title: listing.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: listing.title,
      description,
      url,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: listing.title, description, images: image ? [image] : undefined },
    robots: listing.status === "EXPIRED" ? { index: false, follow: true } : undefined,
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === listing?.sellerId;
  const isAdmin = !!viewer?.adminRole;

  if (!listing) notFound();
  if (!isPubliclyViewable(listing.status) && !isOwner && !isAdmin) notFound();

  const h = await headers();
  await recordListingView(listing.id, clientIp(h), viewer?.id);

  const [similar, ratingSummary] = await Promise.all([getSimilarListings(listing), getRatingSummary(listing.sellerId)]);

  const location = [listing.location?.city, listing.location?.state].filter(Boolean).join(", ");
  const fullAddress = listing.location?.showAddressPublicly ? listing.location.address : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: listing.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      price: listing.isFree ? 0 : listing.priceCents != null ? (listing.priceCents / 100).toFixed(2) : undefined,
      priceCurrency: "USD",
      availability: listing.status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {(listing.status === "EXPIRED" || listing.status === "PAUSED") && (isOwner || isAdmin) && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This listing is {listing.status === "EXPIRED" ? "expired" : "paused"} and not visible to other users.
          {listing.status === "EXPIRED" && (
            <Link href="/dashboard/listings" className="ml-2 font-semibold underline">
              Renew for $1
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <Gallery images={listing.images} title={listing.title} />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge>{listing.category.name}</Badge>
            {listing.subcategory && <Badge>{listing.subcategory.name}</Badge>}
            {listing.condition !== "NOT_APPLICABLE" && <Badge tone="info">{CONDITION_LABELS[listing.condition]}</Badge>}
            {listing.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          <h1 className="mt-3 text-2xl font-bold text-slate-900">{listing.title}</h1>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {listing.isFree ? "Free" : listing.priceCents != null ? formatCents(listing.priceCents) : "Contact for price"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {fullAddress ? `${fullAddress}, ` : ""}
            {location}
            {listing.publishedAt && <> · Posted {new Date(listing.publishedAt).toLocaleDateString()}</>}
          </p>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{listing.description}</div>

          {listing.attributes.length > 0 && (
            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700">Details</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {listing.attributes.map((a) => (
                  <div key={a.key}>
                    <dt className="text-slate-400">{a.label}</dt>
                    <dd className="font-medium text-slate-700">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {listing.expiresAt && (isOwner || isAdmin) && (
            <p className="mt-4 text-xs text-slate-400">
              {listing.status === "ACTIVE" ? "Expires" : "Expired"} {new Date(listing.expiresAt).toLocaleDateString()}
            </p>
          )}

          <div className="mt-8">
            <ReportButton targetType="LISTING" targetId={listing.id} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            {!isOwner && listing.status === "ACTIVE" && (
              <div className="space-y-2">
                {listing.contactViaMessages && <ContactSellerButton listingId={listing.id} listingTitle={listing.title} />}
                {listing.contactViaPhone && listing.seller.phone && (
                  <LinkButton href={`tel:${listing.seller.phone}`} variant="outline" className="w-full">
                    <Phone size={16} /> {listing.seller.phone}
                  </LinkButton>
                )}
                {listing.contactViaEmail && listing.seller.email && (
                  <LinkButton href={`mailto:${listing.seller.email}`} variant="outline" className="w-full">
                    <Mail size={16} /> Email seller
                  </LinkButton>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <FavoriteButton listingId={listing.id} />
                  <ShareButton url={`${clientEnv.NEXT_PUBLIC_APP_URL}/listings/${listing.slug}`} title={listing.title} />
                </div>
              </div>
            )}
            {isOwner && (
              <LinkButton href="/dashboard/listings" className="w-full">
                Manage this listing
              </LinkButton>
            )}
          </div>

          <SellerCard seller={listing.seller} ratingSummary={ratingSummary} />
        </aside>
      </div>

      {similar.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Similar listings</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {similar.map((s) => (
              <ListingCard
                key={s.id}
                listing={{
                  id: s.id,
                  slug: s.slug,
                  title: s.title,
                  priceCents: s.priceCents,
                  isFree: s.isFree,
                  thumbnailUrl: s.images[0]?.thumbnailUrl ?? null,
                  city: s.location?.city ?? null,
                  state: s.location?.state ?? null,
                  publishedAt: s.publishedAt,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
