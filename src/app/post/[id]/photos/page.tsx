"use client";

import { use, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { WizardSteps } from "@/components/listing-wizard-steps";
import { useListing } from "@/lib/hooks/use-listing";
import { Button } from "@/components/ui/button";
import { Star, Trash2, ChevronLeft, ChevronRight, UploadCloud } from "lucide-react";

export default function PhotosStepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { listing, loading, reload } = useListing(id);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setUploading(true);
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/listings/${id}/images`, { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? `Could not upload ${file.name}`);
          break;
        }
      }
      setUploading(false);
      reload();
    },
    [id, reload],
  );

  async function setPrimary(imageId: string) {
    await fetch(`/api/listings/${id}/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    reload();
  }

  async function deleteImage(imageId: string) {
    await fetch(`/api/listings/${id}/images/${imageId}`, { method: "DELETE" });
    reload();
  }

  async function move(index: number, direction: -1 | 1) {
    if (!listing) return;
    const images = [...listing.images].sort((a, b) => a.sortOrder - b.sortOrder);
    const target = images[index + direction];
    const current = images[index];
    if (!target || !current) return;
    [images[index], images[index + direction]] = [images[index + direction]!, images[index]!];
    await fetch(`/api/listings/${id}/images/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: images.map((i) => i.id) }),
    });
    reload();
  }

  if (loading || !listing) return <p className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500">Loading…</p>;

  const images = [...listing.images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <WizardSteps current={3} />
      <h1 className="text-2xl font-bold text-slate-900">Add photos</h1>
      <p className="mt-1 text-sm text-slate-500">Up to 12 photos. Drag to reorder or use the arrows. First photo is the cover image.</p>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <UploadCloud className="text-slate-400" size={32} />
        <p className="mt-2 text-sm font-medium text-slate-600">{uploading ? "Uploading…" : "Drag photos here, or click to browse"}</p>
        <p className="text-xs text-slate-400">JPEG, PNG, WEBP, or HEIC</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, index) => (
            <div key={img.id} className="group relative overflow-hidden rounded-xl border border-slate-200">
              <div className="relative aspect-square">
                <Image src={img.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
              </div>
              {img.isPrimary && (
                <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">Cover</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1">
                <div className="flex gap-1">
                  <button disabled={index === 0} onClick={() => move(index, -1)} className="text-white disabled:opacity-30">
                    <ChevronLeft size={16} />
                  </button>
                  <button disabled={index === images.length - 1} onClick={() => move(index, 1)} className="text-white disabled:opacity-30">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="flex gap-2">
                  {!img.isPrimary && (
                    <button onClick={() => setPrimary(img.id)} title="Set as cover" className="text-white hover:text-yellow-300">
                      <Star size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteImage(img.id)} title="Delete" className="text-white hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.push(`/post/${id}/details`)}>
          Back
        </Button>
        <Button className="flex-1" onClick={() => router.push(`/post/${id}/preview`)}>
          Continue to preview
        </Button>
      </div>
    </div>
  );
}
