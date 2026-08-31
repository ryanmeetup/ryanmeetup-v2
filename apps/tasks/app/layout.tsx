import type { Metadata } from "next";
import { headers } from "next/headers";
import { InstanceProvider, ThemeProvider } from "@/components/global";
import { TasksFooter } from "@/components/navigation";
import { ToastHost } from "@ryanmeetup/ui";
import { getInstanceSettings } from "@/lib/server/instance-settings";
import { metadataOrigin } from "@/lib/app-url";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-inter",
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

export async function generateMetadata(): Promise<Metadata> {
  const instance = await getInstanceSettings();
  // `headers()` is request-scoped and deduplicated, so reading it here costs
  // nothing beyond what the layout below already pays for the CSP nonce. It
  // lets an unconfigured deployment describe itself by the domain it is
  // actually served from rather than guessing at one.
  return {
    metadataBase: new URL(metadataOrigin(await headers())),
    title: {
      default: instance.name,
      template: `%s | ${instance.name}`,
    },
    description: instance.description,
    applicationName: instance.name,
    openGraph: {
      title: instance.name,
      description: instance.description,
      url: "/",
      siteName: instance.name,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: instance.ogAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: instance.name,
      description: instance.description,
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
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const instance = await getInstanceSettings();

  return (
    <html
      lang="en"
      className={`dark ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className={inter.className}>
        <InstanceProvider settings={instance}>
          <ThemeProvider>
            {children}
            <TasksFooter />
            <ToastHost />
          </ThemeProvider>
        </InstanceProvider>
      </body>
    </html>
  );
}
