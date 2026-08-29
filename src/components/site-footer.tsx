import Link from "next/link";
import { clientEnv } from "@/lib/env";

const columns = [
  {
    title: "Marketplace",
    links: [
      { href: "/search", label: "Browse listings" },
      { href: "/post", label: "Post a listing — $1" },
      { href: "/category/jobs", label: "Jobs" },
      { href: "/category/housing", label: "Housing" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help/safety-guidelines", label: "Safety guidelines" },
      { href: "/help/prohibited-items", label: "Prohibited items" },
      { href: "/help/contact", label: "Contact support" },
      { href: "/help/refund-policy", label: "Refund policy" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/help/terms", label: "Terms of Service" },
      { href: "/help/privacy", label: "Privacy Policy" },
      { href: "/help/community-guidelines", label: "Community Guidelines" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 font-extrabold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs text-white">$1</span>
            {clientEnv.NEXT_PUBLIC_SITE_NAME}
          </div>
          <p className="mt-3 text-sm text-slate-500">$1 to post. Live for 45 days. No subscriptions, ever.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-slate-900">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-500 hover:text-slate-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {clientEnv.NEXT_PUBLIC_SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
