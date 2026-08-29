"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

interface GalleryImage {
  id: string;
  url: string;
  thumbnailUrl: string;
}

export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
        <ImageOff size={48} />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
        <Image src={images[active]!.url} alt={title} fill unoptimized className="object-cover" priority />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 hover:bg-white"
              aria-label="Previous photo"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setActive((i) => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 hover:bg-white"
              aria-label="Next photo"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                i === active ? "ring-emerald-600" : "ring-transparent"
              }`}
            >
              <Image src={img.thumbnailUrl} alt="" fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
