import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SiteFooter } from "@ryanmeetup/ui";
import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import { isShopifyConfigured } from "@/lib/shopify";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://store.ryanmeetup.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Ryan Meetup Store", template: "%s | Ryan Meetup Store" },
  description: "Official Ryan Meetup shirts, sweatshirts, hats, and assorted Ryan provisions.",
  openGraph: {
    type: "website",
    siteName: "Ryan Meetup Store",
    title: "Ryan Meetup Store",
    description: "Official goods for Ryans and the Ryan-curious.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const commerceConfigured = isShopifyConfigured();
  return (
    <html lang="en">
      <body className="antialiased">
        <CartProvider commerceConfigured={commerceConfigured}>
          {!commerceConfigured && (
            <div className="bg-nametag px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Store preview · Connect Shopify to enable live checkout
            </div>
          )}
          <Header />
          {children}
          <div className="store-container">
            <SiteFooter
              title="RYAN"
              subtitle="General Store"
              homeHref="/"
              sections={[
                { title: "Shop", links: [
                  { href: "/collections/all", label: "All goods" },
                  { href: "/collections/apparel", label: "Apparel" },
                  { href: "/collections/accessories", label: "Accessories" },
                ] },
                { title: "Ryan Meetup", links: [
                  { href: "https://ryanmeetup.com", label: "Main site" },
                  { href: "https://ryanmeetup.com/contact", label: "Contact" },
                  { href: "https://ryanmeetup.com/faqs", label: "FAQs" },
                ] },
              ]}
              credit={{ href: "https://ryanmeetup.com", label: "Ryan Meetup", prefix: "Official goods by ", suffix: "." }}
            />
          </div>
          <Analytics />
        </CartProvider>
      </body>
    </html>
  );
}
