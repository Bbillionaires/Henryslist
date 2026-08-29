"use client";

import { use, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WizardSteps } from "@/components/listing-wizard-steps";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function PaymentStatus({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setMessage("Missing payment session.");
      return;
    }
    fetch(`/api/listings/${id}/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Payment could not be verified.");
        if (data.status === "ACTIVE") {
          setState("success");
        } else {
          setState("error");
          setMessage("Payment is still processing. Refresh in a moment, or check your dashboard.");
        }
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
  }, [id, sessionId]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 py-16 text-center">
      {state === "verifying" && (
        <>
          <Loader2 className="animate-spin text-slate-400" size={40} />
          <p className="mt-4 text-slate-600">Confirming your payment…</p>
        </>
      )}
      {state === "success" && (
        <>
          <CheckCircle2 className="text-emerald-600" size={48} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Your listing is live!</h1>
          <p className="mt-1 text-sm text-slate-500">It&apos;s active for 45 days and visible to buyers now.</p>
          <div className="mt-6 flex gap-3">
            <Link href={`/listings/${id}`}>
              <Button>View listing</Button>
            </Link>
            <Link href="/dashboard/listings">
              <Button variant="outline">Go to dashboard</Button>
            </Link>
          </div>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="text-red-500" size={48} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">We couldn&apos;t confirm payment</h1>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
          <Link href={`/post/${id}/preview`} className="mt-6">
            <Button variant="outline">Back to preview</Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function PaymentStepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <WizardSteps current={5} />
      <Suspense>
        <PaymentStatus id={id} />
      </Suspense>
    </div>
  );
}
