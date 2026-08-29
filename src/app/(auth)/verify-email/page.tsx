"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function VerifyEmailInner() {
  const token = useSearchParams().get("token");
  const { update } = useSession();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setState("success");
        update(); // refresh JWT so session.user.emailVerified flips immediately
      })
      .catch(() => setState("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {state === "loading" && <p className="text-slate-500">Verifying…</p>}
      {state === "success" && (
        <>
          <h1 className="text-2xl font-bold text-slate-900">Email verified</h1>
          <p className="mt-2 text-sm text-slate-500">You can now post listings and message sellers.</p>
          <Button className="mt-6" onClick={() => (window.location.href = "/dashboard")}>
            Go to dashboard
          </Button>
        </>
      )}
      {state === "error" && (
        <>
          <h1 className="text-2xl font-bold text-slate-900">Link expired or invalid</h1>
          <p className="mt-2 text-sm text-slate-500">Request a new verification email from your account settings.</p>
          <Link href="/dashboard/settings" className="mt-6 inline-block font-semibold text-emerald-700 hover:underline">
            Go to account settings
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
