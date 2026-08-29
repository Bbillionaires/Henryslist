import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function buildHref(params: Record<string, string | undefined>, page: number) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") usp.set(k, v);
  }
  usp.set("page", String(page));
  return `/search?${usp.toString()}`;
}

export function Pagination({ page, totalPages, params }: { page: number; totalPages: number; params: Record<string, string | undefined> }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      <Link
        href={buildHref(params, Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium ${
          page <= 1 ? "pointer-events-none opacity-40" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <ChevronLeft size={16} /> Previous
      </Link>
      <span className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(params, Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium ${
          page >= totalPages ? "pointer-events-none opacity-40" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        Next <ChevronRight size={16} />
      </Link>
    </div>
  );
}
