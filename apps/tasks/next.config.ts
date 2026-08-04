import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { standardSecurityHeaders } from "./lib/security-headers";

const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: [
    "@ryanmeetup/brand",
    "@ryanmeetup/hooks",
    "@ryanmeetup/ui",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...standardSecurityHeaders,
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
