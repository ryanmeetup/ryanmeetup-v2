import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ryanmeetup/brand",
    "@ryanmeetup/hooks",
    "@ryanmeetup/ui",
  ],
};

export default nextConfig;
