import Link from "next/link";
import type { ReactNode } from "react";
import { Divider } from "./Divider";
import { Heading } from "./Heading";

export type SiteFooterLink = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export type SiteFooterSection = {
  title: string;
  links: SiteFooterLink[];
  columns?: 1 | 2;
};

export type SiteFooterCredit = {
  href: string;
  label: string;
  prefix?: string;
  suffix?: string;
};

export type SiteFooterProps = {
  title: string;
  subtitle?: string;
  sections?: SiteFooterSection[];
  socialLinks?: SiteFooterLink[];
  homeHref?: string;
  credit?: SiteFooterCredit;
  className?: string;
  /**
   * `branded` is the marquee shape: an oversized wordmark and subtitle, the
   * link sections, then credit and socials. Everything in it is supplied by
   * the caller, so it is a layout rather than any one organization's footer.
   * `minimal` is one quiet row — credit and socials only.
   */
  variant?: "branded" | "minimal";
};

export function SiteFooter({
  title,
  subtitle = "",
  sections = [],
  socialLinks = [],
  homeHref = "/",
  credit,
  className = "",
  variant = "branded",
}: SiteFooterProps) {
  if (variant === "minimal")
    return (
      <footer
        className={`relative flex flex-col items-center justify-between gap-3 border-t border-black/10 bg-white py-6 text-sm text-black/70 sm:flex-row dark:border-white/10 dark:bg-black/80 dark:text-white/70 ${className}`}
      >
        <Link
          href={homeHref}
          className="rounded-sm font-cooper uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
        >
          {title}
        </Link>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
          {credit && (
            <span>
              {credit.prefix ?? "Website designed and developed by "}
              <Link
                href={credit.href}
                className="rounded-sm font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
              >
                {credit.label}
              </Link>
              {credit.suffix ?? ". All Rights Reserved."}
            </span>
          )}

          {socialLinks.length > 0 && (
            <ul className="flex flex-wrap gap-4">
              {socialLinks.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    aria-label={link.label}
                    className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
                  >
                    {link.icon ?? link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </footer>
    );

  return (
    <footer
      className={`relative border-t border-black/10 bg-white py-10 dark:border-white/10 dark:bg-black/80 ${className}`}
    >
      <div
        className={`grid gap-10 ${sections.length > 0 ? "xl:grid-cols-[1.2fr_1fr]" : ""}`}
      >
        <div className="space-y-4 text-center">
          <Link
            href={homeHref}
            className="flex flex-col items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
          >
            <Heading
              className="title text-4xl sm:text-5xl md:text-6xl"
              size="h2"
            >
              {title}
            </Heading>
            <p className="title mt-[2px] text-center font-cooper text-xl uppercase sm:text-2xl md:text-3xl">
              {subtitle}
            </p>
          </Link>
        </div>

        <div
          className={`grid gap-8 ${sections.length > 1 ? "sm:grid-cols-2" : ""} ${sections.length === 0 ? "hidden" : ""}`}
        >
          {sections.map((section) => (
            <section
              key={section.title}
              aria-labelledby={`footer-${section.title.toLowerCase().replaceAll(" ", "-")}`}
            >
              <h2
                id={`footer-${section.title.toLowerCase().replaceAll(" ", "-")}`}
                className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70"
              >
                {section.title}
              </h2>
              <ul
                className={`grid gap-x-4 gap-y-2 text-sm font-medium text-black/70 dark:text-white/70 ${section.columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {section.links.map((link) => (
                  <li key={`${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <Divider margins="lg" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {credit && (
          <span className="text-sm text-black/70 dark:text-white/70 sm:text-center">
            {credit.prefix ?? "Website designed and developed by "}
            <Link
              href={credit.href}
              className="rounded-sm font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
            >
              {credit.label}
            </Link>
            {credit.suffix ?? ". All Rights Reserved."}
          </span>
        )}

        {socialLinks.length > 0 && (
          <ul className="flex flex-wrap gap-6">
            {socialLinks.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <Link
                  href={link.href}
                  aria-label={link.label}
                  className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
                >
                  {link.icon ?? link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
