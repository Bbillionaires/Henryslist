import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/rbac";
import { ListChecks, FileEdit, PauseCircle, Clock, MessageCircle, Heart, Bookmark, CreditCard, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard/listings", label: "My Listings", icon: ListChecks },
  { href: "/dashboard/listings?status=DRAFT", label: "Drafts", icon: FileEdit },
  { href: "/dashboard/listings?status=PAUSED", label: "Paused", icon: PauseCircle },
  { href: "/dashboard/listings?status=EXPIRED", label: "Expired", icon: Clock },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/saved-searches", label: "Saved Searches", icon: Bookmark },
  { href: "/dashboard/payments", label: "Payment History", icon: CreditCard },
  { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  return (
    <div className="container-page grid grid-cols-1 gap-8 py-8 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-20 md:self-start">
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
