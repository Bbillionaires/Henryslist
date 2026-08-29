import { listingSearchSchema } from "@/lib/validation/listing";
import { searchListings } from "@/lib/search";
import { getCategoriesWithSubcategories } from "@/lib/categories";
import { ListingCard } from "@/components/listing-card";
import { SearchFilters } from "./search-filters";
import { Pagination } from "./pagination";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Search listings" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listingSearchSchema.safeParse(flat);
  const params = parsed.success ? parsed.data : listingSearchSchema.parse({});

  const [categories, results] = await Promise.all([getCategoriesWithSubcategories(), searchListings(params)]);

  return (
    <div className="container-page py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <aside>
          <SearchFilters categories={categories} params={flat} />
        </aside>

        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h1 className="text-xl font-bold text-slate-900">
              {results.total.toLocaleString()} result{results.total === 1 ? "" : "s"}
              {params.q ? ` for "${params.q}"` : ""}
            </h1>
          </div>

          {results.listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center text-slate-500">
              No listings match your search. Try broadening your filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {results.listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          <Pagination page={results.page} totalPages={results.totalPages} params={flat} />
        </div>
      </div>
    </div>
  );
}
