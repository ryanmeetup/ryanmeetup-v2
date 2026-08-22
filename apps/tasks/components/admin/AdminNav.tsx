"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminRoutes, isActiveAdminRoute } from "@/lib/admin/admin-routes";

/**
 * Tab strip for the owner-only admin pages. `AdminPageShell` renders it above
 * every admin screen, because the surrounding workspace shell is composed per
 * page rather than by a route layout.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-black/10 pb-px dark:border-white/10"
    >
      {adminRoutes.map((route) => {
        const active = isActiveAdminRoute(pathname, route);
        return (
          <Link
            key={route.href}
            href={route.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:focus-visible:ring-white/40 ${
              active
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-black/55 hover:border-black/20 hover:text-black dark:text-white/55 dark:hover:border-white/20 dark:hover:text-white"
            }`}
          >
            <route.icon aria-hidden className="shrink-0 opacity-60" />
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}
