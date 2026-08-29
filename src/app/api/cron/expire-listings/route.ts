import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runExpirationSweep } from "@/lib/listings/expiration";
import { runSavedSearchSweep } from "@/lib/saved-searches";

// Intended to be called on a schedule (Vercel Cron, GitHub Actions, or a
// plain `curl` from system crontab) roughly hourly. Protected by a shared
// secret rather than user auth, since no human is signed in when it fires.
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${env.CRON_SECRET}`) return true;
  const secretParam = req.nextUrl.searchParams.get("secret");
  return secretParam === env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expirationResult = await runExpirationSweep();
  const savedSearchResult = await runSavedSearchSweep();

  return NextResponse.json({ ok: true, expirationResult, savedSearchResult });
}
