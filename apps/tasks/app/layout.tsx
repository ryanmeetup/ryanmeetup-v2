import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tasks · Ryan Meetup",
  description: "The private team workspace for keeping Ryan Meetup work moving.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
