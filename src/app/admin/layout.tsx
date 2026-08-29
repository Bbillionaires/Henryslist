import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/rbac";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  FolderTree,
  CreditCard,
  Flag,
  Star,
  Settings,
  FileText,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/listings", label: "Listings", icon: ListChecks },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/content", label: "Content Pages", icon: FileText },
  { href: "/admin/admins", label: "Admin Users", icon: ShieldCheck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (!user.adminRole) redirect("/dashboard");

  return (
    <div className="container-page grid grid-cols-1 gap-8 py-8 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-20 md:self-start">
        <div className="mb-4 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">
          <div className="font-semibold">Admin dashboard</div>
          <div className="text-slate-300">{user.adminRole.replace("_", " ")}</div>
        </div>
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
