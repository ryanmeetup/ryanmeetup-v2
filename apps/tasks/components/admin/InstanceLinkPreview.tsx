"use client";

import type { InstanceSettings } from "@/lib/instance";

/**
 * A scaled rendering of the Open Graph card produced by
 * `app/opengraph-image.tsx`, so the owner can see what the link-preview fields
 * actually compose before saving them.
 *
 * The layout mirrors that route deliberately. It is not shared code: the route
 * runs in Satori, which supports only a narrow subset of CSS and requires
 * explicit `display: flex` on every node, so the two are kept in step by hand.
 */
export function InstanceLinkPreview({
  settings,
}: {
  settings: InstanceSettings;
}) {
  return (
    <div
      aria-label="Preview of the link-preview card"
      className="@container w-full max-w-lg overflow-hidden rounded-xl border border-black/10 bg-[#09090b] p-[4%] text-white shadow-sm dark:border-white/15"
      style={{ aspectRatio: "1200 / 630" }}
    >
      <div className="flex h-full w-full flex-col justify-between rounded-[6%/11%] border border-white/15 p-[4.5%]">
        <div className="flex items-center gap-[3%] text-[2.6cqw] font-bold uppercase tracking-[0.14em]">
          <span className="grid aspect-square w-[8%] shrink-0 place-items-center rounded-[22%] bg-white text-[#09090b]">
            {settings.monogram}
          </span>
          <span className="truncate">{settings.name}</span>
        </div>

        <div className="min-w-0">
          <p className="truncate text-[11cqw] font-extrabold leading-none tracking-[-0.055em]">
            {settings.ogHeadline}
          </p>
          <p className="mt-[3%] truncate text-[3.4cqw] text-white/70">
            {settings.ogTagline}
          </p>
        </div>

        <div className="flex items-center gap-[2%] text-[2.4cqw] text-white/50">
          <span className="aspect-square w-[1.6%] shrink-0 rounded-full bg-[#4ade80]" />
          <span className="truncate">{settings.ogMotto}</span>
        </div>
      </div>
    </div>
  );
}
