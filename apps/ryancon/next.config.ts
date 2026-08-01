import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ryanmeetup/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.ctfassets.net",
        port: "",
      },
      {
        protocol: "https",
        hostname: "downloads.ctfassets.net",
        port: "",
      },
      {
        protocol: "https",
        hostname: "js.stripe.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "play-lh.googleusercontent.com",
        port: "",
      },
    ],
  },
};

export default nextConfig;
