import Link from "next/link";
import { getPlatformSettings } from "@/lib/settings";
import { getRecentListings, getTrendingListings, getPopularCategories } from "@/lib/homepage";
import { getCategoriesWithSubcategories } from "@/lib/categories";
import { HomepageHero } from "@/components/homepage-hero";
import { ListingCard } from "@/components/listing-card";
import { CategoryIcon } from "@/components/category-icon";
import { ArrowRight } from "lucide-react";

// Listings are constantly posted/expiring, so the homepage must reflect
// current data on every request rather than being frozen at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, categories, recentListings, trendingListings, popularCategories] = await Promise.all([
    getPlatformSettings(),
    getCategoriesWithSubcategories(),
    getRecentListings(12),
    getTrendingListings(8),
    getPopularCategories(8),
  ]);

  const displayCategories = popularCategories.length >= 4 ? popularCategories : categories;

  return (
    <div>
      <HomepageHero tagline={settings.homepage_tagline} subtitle={settings.homepage_subtitle} />

      <section className="container-page py-12">
        <h2 className="text-xl font-bold text-slate-900">Browse categories</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center hover:border-emerald-300 hover:bg-emerald-50"
            >
              <CategoryIcon name={cat.icon} size={24} className="text-emerald-600" />
              <span className="text-sm font-medium text-slate-700">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {settings.featured_listings_enabled && trendingListings.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50 py-12">
          <div className="container-page">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Popular right now</h2>
              <Link href="/search?sort=newest" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {trendingListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={{
                    id: listing.id,
                    slug: listing.slug,
                    title: listing.title,
                    priceCents: listing.priceCents,
                    isFree: listing.isFree,
                    thumbnailUrl: listing.images[0]?.thumbnailUrl ?? null,
                    city: listing.location?.city ?? null,
                    state: listing.location?.state ?? null,
                    publishedAt: listing.publishedAt,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-page py-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Recently posted</h2>
          <Link href="/search?sort=newest" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recentListings.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            No listings yet.{" "}
            <Link href="/post" className="font-semibold text-emerald-700 underline">
              Be the first to post one
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {recentListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={{
                  id: listing.id,
                  slug: listing.slug,
                  title: listing.title,
                  priceCents: listing.priceCents,
                  isFree: listing.isFree,
                  thumbnailUrl: listing.images[0]?.thumbnailUrl ?? null,
                  city: listing.location?.city ?? null,
                  state: listing.location?.state ?? null,
                  publishedAt: listing.publishedAt,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-slate-100 bg-emerald-600 py-14 text-center text-white">
        <div className="container-page">
          <h2 className="text-2xl font-bold sm:text-3xl">Buy. Sell. Find. For Just $1.</h2>
          <p className="mt-2 text-emerald-50">Post your listing for $1 and keep it live for {settings.listing_duration_days} days.</p>
          <Link
            href="/post"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Post a Listing — $1
          </Link>
        </div>
      </section>

      {displayCategories.length > 0 && (
        <section className="container-page py-8 text-center text-xs text-slate-400">
          Popular: {displayCategories.map((c, i) => (
            <span key={c.id}>
              <Link href={`/category/${c.slug}`} className="hover:text-emerald-700 hover:underline">
                {c.name}
              </Link>
              {i < displayCategories.length - 1 && " · "}
            </span>
          ))}
        </section>
      )}
    </div>
  );
}
