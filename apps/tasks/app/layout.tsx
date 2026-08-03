import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastHost } from "@ryanmeetup/ui";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://tasks.ryanmeetup.com"),
  title: {
    default: "Ryan Meetup Tasks",
    template: "%s | Ryan Meetup Tasks",
  },
  description:
    "The private workspace for the Ryan Meetup core team to plan projects and keep work moving.",
  applicationName: "Ryan Meetup Tasks",
  openGraph: {
    title: "Ryan Meetup Tasks",
    description:
      "The private workspace for the Ryan Meetup core team to plan projects and keep work moving.",
    url: "/",
    siteName: "Ryan Meetup Tasks",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Ryan Meetup Tasks — private team workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ryan Meetup Tasks",
    description:
      "The private workspace for the Ryan Meetup core team to plan projects and keep work moving.",
    images: ["/opengraph-image"],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <ToastHost />
        </ThemeProvider>
      </body>
    </html>
  );
}
