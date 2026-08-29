"use client";

import { useCallback, useEffect, useState } from "react";
import { Input, Select, Label } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface AdminRow {
  id: string;
  role: string;
  active: boolean;
  grantedAt: string;
  user: { id: string; name: string | null; email: string | null };
}

const ROLES = ["SUPER_ADMIN", "MODERATOR", "SUPPORT_AGENT", "FINANCE_ADMIN"];

export default function AdminAdminsPage() {
  const { push } = useToast();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MODERATOR");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/admins");
    const data = await res.json();
    if (res.ok) setAdmins(data.admins);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function grant() {
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    setEmail("");
    push("Admin access granted", "success");
    load();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke admin access for this user?")) return;
    const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Access revoked", "success");
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin Users</h1>

      <Card className="p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="grantEmail">User email (must already have an account)</Label>
            <Input id="grantEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <Label htmlFor="grantRole">Role</Label>
            <Select id="grantRole" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={grant}>Grant access</Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <Card className="divide-y divide-slate-100">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-800">{a.user.name ?? a.user.email}</p>
                <p className="text-xs text-slate-400">{a.user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="info">{a.role.replace("_", " ")}</Badge>
                <Button size="sm" variant="ghost" onClick={() => revoke(a.id)}>
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
