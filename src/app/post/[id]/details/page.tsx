"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardSteps } from "@/components/listing-wizard-steps";
import { useListing } from "@/lib/hooks/use-listing";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DynamicField, type CategoryFieldDTO, type AttributeValue } from "@/components/dynamic-field";
import { CONDITION_LABELS } from "@/lib/constants";

const CONDITION_VALUES = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR", "NOT_APPLICABLE"] as const;

export default function DetailsStepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { listing, loading, error: loadError } = useListing(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [condition, setCondition] = useState<(typeof CONDITION_VALUES)[number]>("NOT_APPLICABLE");
  const [tagsInput, setTagsInput] = useState("");
  const [contactViaMessages, setContactViaMessages] = useState(true);
  const [contactViaPhone, setContactViaPhone] = useState(false);
  const [contactViaEmail, setContactViaEmail] = useState(false);
  const [address, setAddress] = useState("");
  const [showExactAddress, setShowExactAddress] = useState(false);

  const [fields, setFields] = useState<CategoryFieldDTO[]>([]);
  const [attributes, setAttributes] = useState<Record<string, AttributeValue>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!listing || hydrated) return;
    setTitle(listing.title === "Untitled listing" ? "" : listing.title);
    setDescription(listing.description);
    setPrice(listing.priceCents != null ? (listing.priceCents / 100).toString() : "");
    setIsFree(listing.isFree);
    setCondition((listing.condition as (typeof CONDITION_VALUES)[number]) ?? "NOT_APPLICABLE");
    setTagsInput(listing.tags.join(", "));
    setContactViaMessages(listing.contactViaMessages);
    setContactViaPhone(listing.contactViaPhone);
    setContactViaEmail(listing.contactViaEmail);
    setAddress(listing.location?.address ?? "");
    const attrs: Record<string, AttributeValue> = {};
    for (const a of listing.attributes) attrs[a.key] = a.value;
    setAttributes(attrs);
    setHydrated(true);
  }, [listing, hydrated]);

  useEffect(() => {
    if (!listing) return;
    const url = new URL(`/api/categories/${listing.categoryId}/fields`, window.location.origin);
    if (listing.subcategoryId) url.searchParams.set("subcategoryId", listing.subcategoryId);
    fetch(url).then(async (res) => {
      const data = await res.json();
      setFields(data.fields ?? []);
    });
  }, [listing]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSaving(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        priceCents: isFree || !price ? (isFree ? 0 : null) : Math.round(parseFloat(price) * 100),
        isFree,
        condition,
        tags,
        contactViaMessages,
        contactViaPhone,
        contactViaEmail,
        address,
        showExactAddress,
        attributes,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      if (data.errors) setFieldErrors(data.errors);
      setFormError(data.error ?? "Please fix the errors below.");
      return;
    }
    router.push(`/post/${id}/photos`);
  }

  if (loading) return <p className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500">Loading…</p>;
  if (loadError || !listing) return <p className="mx-auto max-w-2xl px-4 py-10 text-sm text-red-600">{loadError ?? "Listing not found."}</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <WizardSteps current={2} />
      <h1 className="text-2xl font-bold text-slate-900">Tell us about it</h1>
      <p className="mt-1 text-sm text-slate-500">
        Posting in <strong>{listing.category.name}</strong>
        {listing.subcategory ? ` / ${listing.subcategory.name}` : ""}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        {formError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

        <div>
          <Label htmlFor="title" required>Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="What are you posting?" />
          <FieldError>{fieldErrors.title}</FieldError>
        </div>

        <div>
          <Label htmlFor="description" required>Description</Label>
          <Textarea id="description" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
          <FieldError>{fieldErrors.description}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              disabled={isFree}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              This item is free
            </label>
          </div>
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select id="condition" value={condition} onChange={(e) => setCondition(e.target.value as (typeof CONDITION_VALUES)[number])}>
              <option value="NOT_APPLICABLE">Not applicable</option>
              {CONDITION_VALUES.slice(0, 5).map((v) => (
                <option key={v} value={v}>
                  {CONDITION_LABELS[v]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-700">{listing.category.name} details</h2>
            {fields.map((f) => (
              <DynamicField
                key={f.key}
                field={f}
                value={attributes[f.key]}
                onChange={(v) => setAttributes((prev) => ({ ...prev, [f.key]: v }))}
                error={fieldErrors[f.key]}
              />
            ))}
          </div>
        )}

        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="comma, separated, tags" />
        </div>

        <div>
          <Label htmlFor="address">Street address (optional)</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Only shown if you choose to display it" />
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showExactAddress}
              onChange={(e) => setShowExactAddress(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Show my exact address publicly (otherwise only city/ZIP is shown)
          </label>
        </div>

        <div>
          <Label>How can buyers contact you?</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={contactViaMessages}
                onChange={(e) => setContactViaMessages(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              In-app messages (recommended — keeps your email/phone private)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={contactViaPhone}
                onChange={(e) => setContactViaPhone(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show my phone number
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={contactViaEmail}
                onChange={(e) => setContactViaEmail(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show my email address
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/post")}>
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : "Continue to photos"}
          </Button>
        </div>
      </form>
    </div>
  );
}
