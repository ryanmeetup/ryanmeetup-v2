"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FiMenu, FiShoppingBag, FiX } from "react-icons/fi";
import { Heading } from "@ryanmeetup/ui";
import { useCart } from "./cart-provider";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/collections/all", label: "Shop all" },
  { href: "/collections/apparel", label: "Apparel" },
  { href: "/collections/accessories", label: "Accessories" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { cart } = useCart();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-black/70">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_10%,rgba(0,0,0,0.06),transparent_60%),radial-gradient(45%_70%_at_80%_0%,rgba(0,0,0,0.04),transparent_55%)] dark:bg-[radial-gradient(60%_80%_at_20%_10%,rgba(255,255,255,0.08),transparent_60%),radial-gradient(45%_70%_at_80%_0%,rgba(255,255,255,0.05),transparent_55%)]" />
      <div className="store-container relative grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 py-3 xl:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="group w-fit rounded-sm tracking-[0.2em] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40">
          <Heading size="h1" className="text-2xl leading-none sm:text-3xl">RYAN</Heading>
          <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.34em] text-black/55 dark:text-white/55 sm:text-[9px]">General Store</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-1 rounded-full border border-black/10 bg-white/70 p-1 shadow-sm backdrop-blur xl:flex dark:border-white/20 dark:bg-white/10 dark:ring-1 dark:ring-white/10">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/40 ${pathname === link.href ? "bg-black/10 shadow-sm ring-1 ring-black/10 dark:bg-white/20 dark:ring-white/20" : ""}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href="/cart" aria-label={`Cart with ${cart?.totalQuantity ?? 0} items`} className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-3 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:scale-[1.02] hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 sm:px-4 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus-visible:ring-white/40">
            <FiShoppingBag aria-hidden className="text-base" />
            <span className="hidden sm:inline">Cart</span>
            {(cart?.totalQuantity ?? 0) > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-nametag px-1 text-[10px] font-bold text-white">{cart?.totalQuantity}</span>}
          </Link>
          <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-md transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 xl:hidden dark:focus-visible:ring-white/40">
            {open ? <FiX aria-hidden className="h-5 w-5" /> : <FiMenu aria-hidden className="h-5 w-5" />}
          </button>
          <ThemeToggle />
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile navigation" className="store-container relative grid gap-1 border-t border-black/10 py-3 xl:hidden dark:border-white/10">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-3 text-sm font-semibold tracking-wide hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 ${pathname === link.href ? "bg-black/10 dark:bg-white/10" : ""}`}>{link.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
