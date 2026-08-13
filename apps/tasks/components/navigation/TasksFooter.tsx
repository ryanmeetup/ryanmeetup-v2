"use client";

import { SiteFooter } from "@ryanmeetup/ui";
import { usePathname } from "next/navigation";
import { FaInstagram, FaYoutube } from "react-icons/fa";

const publicRoutes = new Set(["/forgot-password", "/login", "/reset-password"]);

export function TasksFooter() {
  const pathname = usePathname();
  const hasSidebar =
    !publicRoutes.has(pathname) && !pathname.startsWith("/auth/");

  return (
    <SiteFooter
      title="RYAN MEETUP"
      subtitle="NO BRYANS ALLOWED"
      className={`tasks-footer px-4 sm:px-6 lg:px-8 ${hasSidebar ? "lg:ml-64" : ""}`}
      sections={[
        {
          title: "Built with",
          columns: 2,
          links: [
            { href: "https://vercel.com", label: "Vercel" },
            { href: "https://nextjs.org/", label: "Next.js" },
            { href: "https://react.dev/", label: "React" },
            { href: "https://tailwindcss.com/", label: "Tailwind CSS" },
            { href: "https://supabase.com/", label: "Supabase" },
            { href: "https://headlessui.com/", label: "Headless UI" },
          ],
        },
      ]}
      socialLinks={[
        {
          href: "https://www.instagram.com/ryanmeetup/",
          icon: <FaInstagram className="title" />,
          label: "Instagram",
        },
        {
          href: "https://www.youtube.com/@ryanmeetup",
          icon: <FaYoutube className="title" />,
          label: "YouTube",
        },
      ]}
      credit={{ href: "https://ryanle.dev/", label: "Ryan Le" }}
    />
  );
}
