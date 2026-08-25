import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SiteFooter } from "@ryanmeetup/ui";
import { ThemeProvider } from "next-themes";
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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <CartProvider commerceConfigured={commerceConfigured}>
            {!commerceConfigured && (
              <div className="store-container border-b border-[#f6c500]/40 bg-nametag py-2 text-center font-cooper text-xs tracking-wide text-white sm:text-sm">
                Store preview · Connect Shopify to enable live checkout
              </div>
            )}
            <Header />
            {children}
            <SiteFooter
              title="RYAN"
              subtitle="General Store"
              homeHref="/"
              className="store-container"
              sections={[
                { title: "Shop", links: [
                  { href: "/collections/all", label: "All goods" },
                  { href: "/collections/apparel", label: "Apparel" },
                  { href: "/collections/accessories", label: "Accessories" },
                ] },
                { title: "Ryan Meetup", links: [
                  { href: "https://ryanmeetup.com", label: "Main site" },
                  { href: "/contact", label: "Store support" },
                  { href: "https://ryanmeetup.com/contact", label: "General contact" },
                  { href: "https://ryanmeetup.com/faqs", label: "FAQs" },
                ] },
              ]}
              credit={{ href: "https://ryanmeetup.com", label: "Ryan Meetup", prefix: "Official goods by ", suffix: "." }}
            />
            <Analytics />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
