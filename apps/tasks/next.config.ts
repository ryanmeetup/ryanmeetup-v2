import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
