import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Scope tracing to this app so Next doesn't pick up the parent lockfile.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
