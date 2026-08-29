import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { listingSearchSchema } from "@/lib/validation/listing";
import { searchListings } from "@/lib/search";
import { getCategoriesWithSubcategories } from "@/lib/categories";
import { ListingCard } from "@/components/listing-card";
import { SearchFilters } from "@/app/search/search-filters";
import { Pagination } from "@/app/search/pagination";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug }, include: { subcategories: { where: { isHidden: false } } } });
  if (!category || category.isHidden) notFound();

  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listingSearchSchema.safeParse({ ...flat, category: slug });
  const params_ = parsed.success ? parsed.data : listingSearchSchema.parse({ category: slug });

  const [categories, results] = await Promise.all([getCategoriesWithSubcategories(), searchListings(params_)]);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
      {category.description && <p className="mt-1 text-sm text-slate-500">{category.description}</p>}

      {category.subcategories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {category.subcategories.map((s) => (
            <Link
              key={s.id}
              href={`/category/${slug}/${s.slug}`}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <aside>
          <SearchFilters categories={categories} params={{ ...flat, category: slug }} />
        </aside>
        <div>
          <p className="mb-4 text-sm text-slate-500">{results.total.toLocaleString()} listings</p>
          {results.listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center text-slate-500">No listings in this category yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {results.listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
          <Pagination page={results.page} totalPages={results.totalPages} params={{ ...flat, category: slug }} />
        </div>
      </div>
    </div>
  );
}
