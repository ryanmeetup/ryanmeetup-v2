"use client";

import { socialIcons, socialLabels } from "@/lib/instance-socials";
import type { InstanceSettings } from "@/lib/instance";

/**
 * A scaled rendering of the footer the current draft would produce.
 *
 * The footer sits at the bottom of this very page, but it is far below the
 * controls and only ever shows the *saved* values, so choosing a style or
 * editing a column gave no feedback. The layout mirrors
 * `packages/ui/src/SiteFooter.tsx`; it is a separate component because that one
 * renders at page scale and pulls in `next/link`.
 */
export function FooterPreview({ settings }: { settings: InstanceSettings }) {
  if (settings.footerVariant === "none")
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-xs text-black/50 dark:border-white/15 dark:text-white/50">
        No footer is rendered.
      </div>
    );

  const socials = settings.footerSocials.map(({ platform }) => (
    <span key={platform} aria-hidden className="text-black/60 dark:text-white/60">
      {socialIcons[platform]}
    </span>
  ));
  const socialNames = settings.footerSocials
    .map(({ platform }) => socialLabels[platform])
    .join(", ");

  const credit = (
    <span>
      {settings.creditPrefix}
      <span className="font-semibold underline">{settings.creditLabel}</span>
      {settings.creditSuffix}
    </span>
  );

  return (
    <div
      role="img"
      aria-label={`Footer preview: ${settings.footerVariant} style${
        socialNames ? `, with ${socialNames}` : ""
      }`}
      className="overflow-hidden rounded-xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.025]"
    >
      {settings.footerVariant === "minimal" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-black/60 dark:text-white/60">
          <span className="font-cooper uppercase tracking-wide">
            {settings.name}
          </span>
          <div className="flex flex-wrap items-center gap-4">
            {credit}
            {socials.length > 0 && (
              <span className="flex gap-3 text-sm">{socials}</span>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            className={`grid gap-6 ${settings.footerSections.length > 0 ? "sm:grid-cols-[1.2fr_1fr]" : ""}`}
          >
            <div className="text-center">
              <p className="font-cooper text-2xl uppercase leading-none">
                {settings.name}
              </p>
              <p className="mt-1 font-cooper text-sm uppercase leading-none text-black/70 dark:text-white/70">
                {settings.footerSubtitle}
              </p>
            </div>

            {settings.footerSections.length > 0 && (
              <div
                className={`grid gap-5 ${settings.footerSections.length > 1 ? "sm:grid-cols-2" : ""}`}
              >
                {settings.footerSections.map((section, index) => (
                  <div key={index}>
                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70">
                      {section.title || "Untitled"}
                    </p>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-black/60 dark:text-white/60">
                      {section.links.map((link, at) => (
                        <li key={at} className="truncate">
                          {link.label || "Untitled link"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 text-[11px] text-black/60 dark:border-white/10 dark:text-white/60">
            {credit}
            {socials.length > 0 && (
              <span className="flex gap-3 text-sm">{socials}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
