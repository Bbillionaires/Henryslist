import { getDashboardStats } from "@/lib/admin/stats";
import { formatCents } from "@/lib/settings";
import { Card } from "@/components/ui/card";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Total users" value={stats.totalUsers.toLocaleString()} />
        <Stat label="New users (30d)" value={stats.newUsers30d.toLocaleString()} />
        <Stat label="Active listings" value={stats.activeListings.toLocaleString()} />
        <Stat label="Expired listings" value={stats.expiredListings.toLocaleString()} />
        <Stat label="Listings today" value={stats.listingsToday.toLocaleString()} />
        <Stat label="Listings this week" value={stats.listingsThisWeek.toLocaleString()} />
        <Stat label="Total revenue" value={formatCents(stats.revenueCents)} />
        <Stat label="New-listing payments" value={stats.newListingPayments.toLocaleString()} />
        <Stat label="Renewal payments" value={stats.renewalPayments.toLocaleString()} />
        <Stat label="Renewal revenue" value={formatCents(stats.renewalRevenueCents)} />
        <Stat label="Failed payments" value={stats.failedPayments.toLocaleString()} />
        <Stat label="Open reports" value={stats.openReports.toLocaleString()} />
        <Stat label="Flagged listings" value={stats.flaggedListings.toLocaleString()} />
        <Stat label="Banned users" value={stats.bannedUsers.toLocaleString()} />
      </div>
    </div>
  );
}
