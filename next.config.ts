import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build (only the deps each
  // route actually needs) — what the Dockerfile copies into the final image.
  output: "standalone",
};

export default nextConfig;
