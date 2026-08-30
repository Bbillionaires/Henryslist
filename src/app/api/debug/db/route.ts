import { NextResponse } from "next/server";

// TEMPORARY diagnostic endpoint for the Vercel runtime-500 investigation.
// Even with every await wrapped in try/catch, this route (and every failing
// page) was still returning Next's generic /500 fallback rather than a JSON
// error - meaning the crash happens at MODULE EVALUATION time (import),
// before any handler code runs, where a normal try/catch can't reach it.
// Using dynamic import() here converts that module-load crash into a
// regular exception this handler CAN catch and report. Delete once the
// root cause is confirmed and fixed.
function serializeError(err: unknown) {
  return {
    error: err instanceof Error ? err.message : String(err),
    name: err instanceof Error ? err.name : undefined,
    stack: err instanceof Error ? err.stack : undefined,
  };
}

export async function GET() {
  const steps: Record<string, unknown> = {};

  const modules: Array<[string, () => Promise<unknown>]> = [
    ["import:@/lib/env", () => import("@/lib/env")],
    ["import:@/lib/prisma", () => import("@/lib/prisma")],
    ["import:@/lib/settings", () => import("@/lib/settings")],
    ["import:@/lib/homepage", () => import("@/lib/homepage")],
    ["import:@/lib/categories", () => import("@/lib/categories")],
    ["import:date-fns", () => import("date-fns")],
    ["import:@/lib/stripe", () => import("@/lib/stripe")],
    ["import:@/lib/storage", () => import("@/lib/storage")],
  ];

  for (const [name, fn] of modules) {
    try {
      await fn();
      steps[name] = "ok";
    } catch (err) {
      steps[name] = serializeError(err);
    }
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    steps.rawQuery = await prisma.$queryRaw`SELECT 1 as ok`;
  } catch (err) {
    steps.rawQuery = serializeError(err);
  }

  try {
    const { getPlatformSettings } = await import("@/lib/settings");
    steps.getPlatformSettings = await getPlatformSettings();
  } catch (err) {
    steps.getPlatformSettings = serializeError(err);
  }

  try {
    const { getRecentListings } = await import("@/lib/homepage");
    steps.getRecentListings = await getRecentListings(12);
  } catch (err) {
    steps.getRecentListings = serializeError(err);
  }

  return NextResponse.json(steps);
}
