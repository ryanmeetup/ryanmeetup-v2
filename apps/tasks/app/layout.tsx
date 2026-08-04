import type { Metadata } from "next";
import { headers } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastHost } from "@ryanmeetup/ui";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  display: "swap",
  weight: "100 900",
});

const themeBootstrapScript = `
try {
  const theme = localStorage.getItem("theme") === "light" ? "light" : "dark";
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
} catch (_) {
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
}
`;

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <ToastHost />
        </ThemeProvider>
      </body>
    </html>
  );
}
