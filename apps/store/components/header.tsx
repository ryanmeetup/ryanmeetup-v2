"use client";

import Link from "next/link";
import { useState } from "react";
import { FiMenu, FiShoppingBag, FiX } from "react-icons/fi";
import { Heading } from "@ryanmeetup/ui";
import { useCart } from "./cart-provider";

const links = [
  { href: "/collections/all", label: "Shop all" },
  { href: "/collections/apparel", label: "Apparel" },
  { href: "/collections/accessories", label: "Accessories" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { cart } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f8f4ec]/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#11100e]/90">
      <div className="store-container flex h-18 items-center gap-5">
        <Link href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40">
          <Heading size="h1" className="text-2xl leading-none sm:text-3xl">RYAN</Heading>
          <span className="block text-[9px] font-bold uppercase tracking-[0.34em] text-black/55 dark:text-white/55">General Store</span>
        </Link>
        <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/40">
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/cart" aria-label={`Cart with ${cart?.totalQuantity ?? 0} items`} className="relative ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-white/70 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 md:ml-2 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10 dark:focus-visible:ring-white/40">
          <FiShoppingBag aria-hidden className="text-lg" />
          {(cart?.totalQuantity ?? 0) > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-nametag px-1 text-[10px] font-bold text-white">{cart?.totalQuantity}</span>}
        </Link>
        <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 md:hidden dark:border-white/15 dark:bg-white/5 dark:focus-visible:ring-white/40">
          {open ? <FiX aria-hidden /> : <FiMenu aria-hidden />}
        </button>
      </div>
      {open && (
        <nav aria-label="Mobile navigation" className="store-container grid gap-1 border-t border-black/10 py-3 md:hidden dark:border-white/10">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-[0.16em] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10">{link.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
