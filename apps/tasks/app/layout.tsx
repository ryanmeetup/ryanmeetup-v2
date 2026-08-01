import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tasks — Make room for what matters",
  description: "A calm, focused place for the things you need to do.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
