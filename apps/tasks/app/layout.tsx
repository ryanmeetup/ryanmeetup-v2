import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastHost } from "@ryanmeetup/ui";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Internal workspace",
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
