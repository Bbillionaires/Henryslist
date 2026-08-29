import { NextResponse } from "next/server";

/**
 * Global security headers. Deliberately does not touch request bodies or
 * cookies, and does not run any auth/redirect logic here — auth gating
 * happens per-route (layouts calling requireUser/requireAdmin, or route
 * handlers calling the same) so the Stripe webhook and other raw-body
 * consumers are never at risk of middleware reading/altering their payload.
 */
export function middleware() {
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets; apply everywhere else,
    // including API routes (headers only — no body access).
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)",
  ],
};
