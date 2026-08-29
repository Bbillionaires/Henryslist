"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { REPORT_REASON_LABELS } from "@/lib/constants";

export function ReportButton({ targetType, targetId }: { targetType: "LISTING" | "USER"; targetId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("SCAM");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openModal() {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    setOpen(true);
  }

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        reason,
        details,
        ...(targetType === "LISTING" ? { listingId: targetId } : { reportedUserId: targetId }),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      push(data.error ?? "Could not submit report.", "error");
      return;
    }
    setOpen(false);
    push("Thanks — our moderation team will review this.", "success");
  }

  return (
    <>
      <button onClick={openModal} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-600">
        <Flag size={14} /> Report {targetType === "LISTING" ? "listing" : "user"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Report this {targetType === "LISTING" ? "listing" : "user"}</h2>
              <button onClick={() => setOpen(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <Label>Reason</Label>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <div className="mt-3">
              <Label>Additional details (optional)</Label>
              <Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
            <Button className="mt-4 w-full" variant="danger" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit report"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
