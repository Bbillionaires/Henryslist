"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { User } from "lucide-react";

interface ProfileData {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  showExactLocation: boolean;
  showPhonePublicly: boolean;
  showEmailPublicly: boolean;
  preferredContactMethod: string;
  isPublic: boolean;
  location: { city: string | null; state: string | null; zip: string | null } | null;
}

interface Prefs {
  emailListingPublished: boolean;
  emailListingExpiring: boolean;
  emailListingExpired: boolean;
  emailNewMessage: boolean;
  emailSavedSearchMatch: boolean;
  emailPriceChange: boolean;
  emailMarketing: boolean;
}

const PREF_LABELS: Record<keyof Prefs, string> = {
  emailListingPublished: "Listing published",
  emailListingExpiring: "Listing expiring soon",
  emailListingExpired: "Listing expired",
  emailNewMessage: "New messages",
  emailSavedSearchMatch: "Saved search matches",
  emailPriceChange: "Price changes on favorites",
  emailMarketing: "Product news & tips",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/profile").then((r) => r.json()), fetch("/api/notification-preferences").then((r) => r.json())]).then(
      ([profileData, prefData]) => {
        setName(profileData.user?.name ?? "");
        setPhone(profileData.user?.phone ?? "");
        setProfile(profileData.profile);
        setCity(profileData.profile?.location?.city ?? "");
        setState(profileData.profile?.location?.state ?? "");
        setZip(profileData.profile?.location?.zip ?? "");
        setPrefs(prefData.preferences);
        setLoading(false);
      },
    );
  }, []);

  async function saveProfile() {
    setSavingProfile(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        displayName: profile?.displayName ?? undefined,
        bio: profile?.bio ?? undefined,
        city,
        state,
        zip,
        showExactLocation: profile?.showExactLocation,
        showPhonePublicly: profile?.showPhonePublicly,
        showEmailPublicly: profile?.showEmailPublicly,
        preferredContactMethod: profile?.preferredContactMethod,
        isPublic: profile?.isPublic,
      }),
    });
    const data = await res.json();
    setSavingProfile(false);
    if (!res.ok) return push(data.error ?? "Could not save.", "error");
    push("Profile saved", "success");
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    setProfile((p) => (p ? { ...p, avatarUrl: data.url } : p));
    push("Photo updated", "success");
  }

  async function savePrefs(next: Prefs) {
    setPrefs(next);
    await fetch("/api/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  async function changePassword() {
    setChangingPassword(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setChangingPassword(false);
    if (!res.ok) return push(data.error, "error");
    setCurrentPassword("");
    setNewPassword("");
    push("Password updated", "success");
  }

  async function deleteAccount() {
    if (!confirm("Delete your account permanently? Your active listings will be removed. This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) return push(data.error, "error");
    push("Account deleted", "success");
    signOut({ callbackUrl: "/" });
  }

  if (loading || !profile || !prefs) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
            {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" fill unoptimized className="object-cover" /> : <User size={28} />}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Change photo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Display name</Label>
            <Input value={profile.displayName ?? ""} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea rows={2} value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={session?.user?.email ?? ""} disabled />
        </div>
        <div>
          <Label>Phone number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label>State</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
          </div>
          <div>
            <Label>ZIP</Label>
            <Input value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? "Saving…" : "Save profile"}
        </Button>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Privacy</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={profile.isPublic}
            onChange={(e) => setProfile({ ...profile, isPublic: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Show my public seller profile
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={profile.showPhonePublicly}
            onChange={(e) => setProfile({ ...profile, showPhonePublicly: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Allow my phone number to be shown on listings (per-listing setting can override)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={profile.showEmailPublicly}
            onChange={(e) => setProfile({ ...profile, showEmailPublicly: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Allow my email to be shown on listings (per-listing setting can override)
        </label>
        <div>
          <Label>Preferred contact method</Label>
          <Select
            value={profile.preferredContactMethod}
            onChange={(e) => setProfile({ ...profile, preferredContactMethod: e.target.value })}
            className="max-w-xs"
          >
            <option value="MESSAGE">In-app messages</option>
            <option value="PHONE">Phone</option>
            <option value="EMAIL">Email</option>
          </Select>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>
          Save privacy settings
        </Button>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Email notifications</h2>
        {(Object.keys(PREF_LABELS) as (keyof Prefs)[]).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={(e) => savePrefs({ ...prefs, [key]: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            {PREF_LABELS[key]}
          </label>
        ))}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Change password</h2>
        <div>
          <Label>Current password</Label>
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div>
          <Label>New password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <Button onClick={changePassword} disabled={changingPassword || !currentPassword || !newPassword}>
          {changingPassword ? "Updating…" : "Update password"}
        </Button>
      </Card>

      <Card className="space-y-3 border-red-200 p-4">
        <h2 className="text-sm font-semibold text-red-700">Delete account</h2>
        <p className="text-sm text-slate-500">This permanently deletes your account and removes your active listings. This cannot be undone.</p>
        <Input type="password" placeholder="Confirm your password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="max-w-xs" />
        <Button variant="danger" onClick={deleteAccount} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete my account"}
        </Button>
      </Card>
    </div>
  );
}
