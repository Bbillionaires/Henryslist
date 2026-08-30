import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build (only the deps each
  // route actually needs) — what the Dockerfile copies into the final image
  // for the Railway/Docker deployment. Vercel has its own build/bundling
  // pipeline and doesn't need (or fully support) this output mode — forcing
  // it there causes runtime 500s. VERCEL=1 is set automatically by Vercel's
  // build environment, so this only takes effect for the Docker build.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
