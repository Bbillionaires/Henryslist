"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import clsx from "clsx";

export function LeaveReviewButton({ revieweeId, revieweeName, listingId }: { revieweeId: string; revieweeName: string; listingId?: string }) {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revieweeId, listingId, rating, body: body || undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return push(data.error ?? "Could not submit review.", "error");
    setOpen(false);
    setDone(true);
    push("Review submitted.", "success");
  }

  if (done) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-600">
        <Star size={14} /> Leave a review
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Review {revieweeName}</h2>
              <button onClick={() => setOpen(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star size={28} className={clsx(n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Label>Comments (optional)</Label>
              <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <Button className="mt-4 w-full" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit review"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
