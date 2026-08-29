"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { requestPasswordResetSchema } from "@/lib/validation/auth";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { z } from "zod";

type FormValues = z.infer<typeof requestPasswordResetSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(requestPasswordResetSchema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
      {submitted ? (
        <p className="mt-4 text-sm text-slate-600">
          If an account exists for that email, we&apos;ve sent a link to reset your password.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send you a reset link.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
