"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus, X } from "lucide-react";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isHidden: boolean;
}
interface CategoryField {
  id: string;
  key: string;
  label: string;
  type: string;
}
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isHidden: boolean;
  subcategories: Subcategory[];
  fields: CategoryField[];
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCategoriesPage() {
  const { push } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    if (res.ok) setCategories(data.categories);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createCategory() {
    if (!newName.trim()) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), slug: slugify(newName) }),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    setNewName("");
    push("Category created", "success");
    load();
  }

  async function updateCategory(id: string, patch: Partial<Category>) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    load();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    push("Category deleted", "success");
    load();
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const target = categories[index + direction];
    const current = categories[index];
    if (!target || !current) return;
    await Promise.all([
      updateCategory(current.id, { sortOrder: target.sortOrder }),
      updateCategory(target.id, { sortOrder: current.sortOrder }),
    ]);
  }

  async function createSubcategory(categoryId: string) {
    const name = newSubName[categoryId]?.trim();
    if (!name) return;
    const res = await fetch(`/api/admin/categories/${categoryId}/subcategories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slugify(name) }),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    setNewSubName((prev) => ({ ...prev, [categoryId]: "" }));
    load();
  }

  async function updateSubcategory(categoryId: string, subId: string, patch: Partial<Subcategory>) {
    const res = await fetch(`/api/admin/categories/${categoryId}/subcategories/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    load();
  }

  async function deleteSubcategory(categoryId: string, subId: string) {
    if (!confirm("Delete this subcategory?")) return;
    const res = await fetch(`/api/admin/categories/${categoryId}/subcategories/${subId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push(data.error, "error");
    load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading categories…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <p className="text-sm text-slate-500">Create, reorder, hide, or delete categories and subcategories.</p>
      </div>

      <Card className="p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="new-cat">New category name</Label>
            <Input id="new-cat" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Musical Instruments" />
          </div>
          <Button onClick={createCategory}>
            <Plus size={16} /> Add category
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {categories.map((cat, index) => (
          <Card key={cat.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col">
                  <button
                    disabled={index === 0}
                    onClick={() => moveCategory(index, -1)}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    disabled={index === categories.length - 1}
                    onClick={() => moveCategory(index, 1)}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <button className="text-left font-semibold text-slate-900" onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}>
                      {cat.name}
                    </button>
                    {cat.isHidden && <Badge tone="warning">Hidden</Badge>}
                    <Badge tone="info">{cat.fields.length} custom field{cat.fields.length === 1 ? "" : "s"}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">/{cat.slug} · {cat.subcategories.length} subcategories</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  title={cat.isHidden ? "Show" : "Hide"}
                  onClick={() => updateCategory(cat.id, { isHidden: !cat.isHidden })}
                  className="rounded p-2 text-slate-500 hover:bg-slate-100"
                >
                  {cat.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button title="Delete" onClick={() => deleteCategory(cat.id)} className="rounded p-2 text-red-500 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {expanded === cat.id && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-700">Subcategories</h3>
                <ul className="mt-2 space-y-1">
                  {cat.subcategories.map((sub) => (
                    <li key={sub.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 hover:bg-slate-50">
                      <span className="text-sm text-slate-700">
                        {sub.name} {sub.isHidden && <Badge tone="warning">Hidden</Badge>}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSubcategory(cat.id, sub.id, { isHidden: !sub.isHidden })}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                          {sub.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => deleteSubcategory(cat.id, sub.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50">
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    placeholder="New subcategory name"
                    value={newSubName[cat.id] ?? ""}
                    onChange={(e) => setNewSubName((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                    className="max-w-xs"
                  />
                  <Button size="sm" variant="outline" onClick={() => createSubcategory(cat.id)}>
                    <Plus size={14} /> Add
                  </Button>
                </div>

                {cat.fields.length > 0 && (
                  <>
                    <h3 className="mt-4 text-sm font-semibold text-slate-700">Custom fields (shown on the posting form)</h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {cat.fields.map((f) => (
                        <Badge key={f.id}>
                          {f.label} ({f.type.toLowerCase()})
                        </Badge>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
