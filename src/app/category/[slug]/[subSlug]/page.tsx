import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { listingSearchSchema } from "@/lib/validation/listing";
import { searchListings } from "@/lib/search";
import { getCategoriesWithSubcategories } from "@/lib/categories";
import { ListingCard } from "@/components/listing-card";
import { SearchFilters } from "@/app/search/search-filters";
import { Pagination } from "@/app/search/pagination";
import { clientEnv } from "@/lib/env";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; subSlug: string }> }): Promise<Metadata> {
  const { slug, subSlug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  const subcategory = await prisma.subcategory.findUnique({ where: { categoryId_slug: { categoryId: category.id, slug: subSlug } } });
  if (!subcategory) return {};
  return {
    title: `${subcategory.name} — ${category.name}`,
    alternates: { canonical: `${clientEnv.NEXT_PUBLIC_APP_URL}/category/${slug}/${subSlug}` },
  };
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, subSlug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category || category.isHidden) notFound();
  const subcategory = await prisma.subcategory.findUnique({ where: { categoryId_slug: { categoryId: category.id, slug: subSlug } } });
  if (!subcategory || subcategory.isHidden) notFound();

  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const merged = { ...flat, category: slug, subcategory: subSlug };
  const parsed = listingSearchSchema.safeParse(merged);
  const params_ = parsed.success ? parsed.data : listingSearchSchema.parse({ category: slug, subcategory: subSlug });

  const [categories, results] = await Promise.all([getCategoriesWithSubcategories(), searchListings(params_)]);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">
        {subcategory.name} <span className="text-slate-400">in {category.name}</span>
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <aside>
          <SearchFilters categories={categories} params={merged} />
        </aside>
        <div>
          <p className="mb-4 text-sm text-slate-500">{results.total.toLocaleString()} listings</p>
          {results.listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center text-slate-500">No listings here yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {results.listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
          <Pagination page={results.page} totalPages={results.totalPages} params={merged} />
        </div>
      </div>
    </div>
  );
}
