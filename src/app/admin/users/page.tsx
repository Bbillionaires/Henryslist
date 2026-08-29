"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface AdminUserRow {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  emailVerified: string | null;
  adminUser: { role: string } | null;
  _count: { listings: number };
}

export default function AdminUsersPage() {
  const { push } = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    const data = await res.json();
    if (res.ok) setUsers(data.users);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function act(id: string, action: "suspend" | "unsuspend" | "ban" | "unban") {
    let reason: string | undefined;
    if (action === "ban") {
      reason = window.prompt("Reason for ban (shown internally):") ?? undefined;
      if (reason === undefined) return;
    }
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Updated", "success");
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this user? Their active listings will be removed. This cannot be undone.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("User deleted", "success");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="max-w-xs" />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Listings</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === "ACTIVE" ? "success" : u.status === "BANNED" ? "danger" : "warning"}>{u.status}</Badge>
                    {u.adminUser && <Badge tone="info" className="ml-1">{u.adminUser.role}</Badge>}
                  </td>
                  <td className="px-4 py-3">{u._count.listings}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {!u.adminUser && (
                      <div className="flex flex-wrap gap-1">
                        {u.status === "ACTIVE" && (
                          <Button size="sm" variant="outline" onClick={() => act(u.id, "suspend")}>
                            Suspend
                          </Button>
                        )}
                        {u.status === "SUSPENDED" && (
                          <Button size="sm" variant="outline" onClick={() => act(u.id, "unsuspend")}>
                            Unsuspend
                          </Button>
                        )}
                        {u.status !== "BANNED" ? (
                          <Button size="sm" variant="danger" onClick={() => act(u.id, "ban")}>
                            Ban
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => act(u.id, "unban")}>
                            Unban
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => del(u.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
