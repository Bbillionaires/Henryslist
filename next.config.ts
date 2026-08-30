import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build (only the deps each
  // route actually needs) — what the Dockerfile copies into the final image
  // for the Railway/Docker deployment. Vercel has its own build/bundling
  // pipeline and doesn't need (or fully support) this output mode — forcing
  // it there causes runtime 500s. VERCEL=1 is set automatically by Vercel's
  // build environment, so this only takes effect for the Docker build.
  output: process.env.VERCEL ? undefined : "standalone",

  // Opt Prisma out of Next's file-tracing/bundling entirely so its native
  // query-engine binary resolves via plain Node `require()` at runtime.
  // Without this, Vercel's serverless functions for App Router *pages*
  // (Server Components) fail to include the engine binary even though
  // Route Handlers hitting the same Prisma client work fine — the two use
  // different bundling paths and only the page path was missing it.
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
};

export default nextConfig;
