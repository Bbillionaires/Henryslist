import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/settings";
import { formatCents } from "@/lib/format";
import { addDays } from "date-fns";
import { WizardSteps } from "@/components/listing-wizard-steps";
import { Badge } from "@/components/ui/card";
import { CONDITION_LABELS } from "@/lib/constants";
import { PreviewActions } from "./preview-actions";

export default async function PreviewStepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/post/${id}/preview`);

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } }, attributes: true, category: true, subcategory: true, location: true },
  });
  if (!listing || listing.sellerId !== user.id) notFound();

  const settings = await getPlatformSettings();
  const priceCents = listing.priceAtPostingCents ?? settings.listing_price_cents;
  const expiresAt = addDays(new Date(), settings.listing_duration_days);
  const cover = listing.images.find((i) => i.isPrimary) ?? listing.images[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <WizardSteps current={4} />
      <h1 className="text-2xl font-bold text-slate-900">Preview your listing</h1>
      <p className="mt-1 text-sm text-slate-500">This is exactly how buyers will see it.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        {cover ? (
          <div className="relative aspect-[4/3] w-full bg-slate-100">
            <Image src={cover.url} alt={listing.title} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100 text-sm text-slate-400">No photos added</div>
        )}
        {listing.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-2">
            {listing.images.map((img) => (
              <div key={img.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                <Image src={img.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-center gap-2">
            <Badge>{listing.category.name}</Badge>
            {listing.subcategory && <Badge>{listing.subcategory.name}</Badge>}
            {listing.condition !== "NOT_APPLICABLE" && <Badge tone="info">{CONDITION_LABELS[listing.condition]}</Badge>}
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{listing.title || "Untitled listing"}</h2>
          <p className="text-lg font-semibold text-emerald-700">
            {listing.isFree ? "Free" : listing.priceCents != null ? formatCents(listing.priceCents) : "Contact for price"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {[listing.location?.city, listing.location?.state, listing.location?.zip].filter(Boolean).join(", ")}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{listing.description}</p>

          {listing.attributes.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-sm">
              {listing.attributes.map((a) => (
                <div key={a.key}>
                  <dt className="text-slate-400">{a.label}</dt>
                  <dd className="font-medium text-slate-700">{a.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="flex justify-between">
          <span>Publishing fee</span>
          <strong>{formatCents(priceCents)}</strong>
        </div>
        <div className="mt-1 flex justify-between">
          <span>Active for</span>
          <strong>{settings.listing_duration_days} days</strong>
        </div>
        <div className="mt-1 flex justify-between">
          <span>Expiration date</span>
          <strong>{expiresAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</strong>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/post/${id}/photos`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to edit
        </Link>
        <PreviewActions listingId={id} priceLabel={formatCents(priceCents)} />
      </div>
    </div>
  );
}
