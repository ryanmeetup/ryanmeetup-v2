/** @type {import('next').NextConfig} */
const nextConfig = {
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
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        port: "",
      },
    ],
  },
};

export default nextConfig;
