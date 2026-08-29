"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X, Search, PlusCircle, User as UserIcon, Heart, MessageCircle, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import type { CategoryWithSubcategories } from "@/lib/categories";
import { clientEnv } from "@/lib/env";
import { NotificationBell } from "@/components/notification-bell";

export function SiteHeader({ categories }: { categories: CategoryWithSubcategories[] }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/search?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <button className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2 font-extrabold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">$1</span>
          <span className="hidden sm:inline text-lg">{clientEnv.NEXT_PUBLIC_SITE_NAME}</span>
        </Link>

        <form onSubmit={onSearch} className="hidden flex-1 md:flex">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings…"
              className="w-full rounded-full border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/post"
            className="hidden items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 sm:flex"
          >
            <PlusCircle size={16} /> Post a Listing — $1
          </Link>
          <Link href="/post" className="sm:hidden" aria-label="Post a listing">
            <PlusCircle size={26} className="text-emerald-600" />
          </Link>

          {status === "authenticated" && <NotificationBell />}

          {status === "authenticated" ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold uppercase text-slate-700">
                  {session.user?.name?.[0] ?? session.user?.email?.[0] ?? "U"}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm font-medium text-slate-700 sm:inline">
                  {session.user?.name ?? session.user?.email}
                </span>
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <MenuLink href="/dashboard" icon={<LayoutDashboard size={16} />}>
                    Dashboard
                  </MenuLink>
                  <MenuLink href="/dashboard/messages" icon={<MessageCircle size={16} />}>
                    Messages
                  </MenuLink>
                  <MenuLink href="/dashboard/favorites" icon={<Heart size={16} />}>
                    Favorites
                  </MenuLink>
                  <MenuLink href="/dashboard/settings" icon={<UserIcon size={16} />}>
                    Account settings
                  </MenuLink>
                  {session.user?.adminRole && (
                    <MenuLink href="/admin" icon={<ShieldCheck size={16} />}>
                      Admin dashboard
                    </MenuLink>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Log in
              </Link>
              <Link
                href="/register"
                className="hidden rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:inline-flex"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>

      <form onSubmit={onSearch} className="border-t border-slate-100 px-4 py-2 md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listings…"
            className="w-full rounded-full border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none"
          />
        </div>
      </form>

      <div className="hidden border-t border-slate-100 md:block">
        <div className="container-page flex items-center gap-1 overflow-x-auto py-2 text-sm">
          {categories.map((cat) => (
            <div key={cat.id} className="group relative shrink-0">
              <Link
                href={`/category/${cat.slug}`}
                className="block whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {cat.name}
              </Link>
              {cat.subcategories.length > 0 && (
                <div className="invisible absolute left-0 top-full z-50 w-56 rounded-xl border border-slate-200 bg-white py-2 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
                  {cat.subcategories.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/category/${cat.slug}/${sub.slug}`}
                      className="block px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="grid grid-cols-2 gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
      {icon}
      {children}
    </Link>
  );
}
