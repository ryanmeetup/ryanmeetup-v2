"use client";

import {
  ogCardDescription,
  ogCardNameScale,
  type InstanceSettings,
} from "@/lib/instance";

/**
 * A scaled rendering of the Open Graph card produced by
 * `app/opengraph-image.tsx`, so the owner can see what the identity actually
 * composes before saving it.
 *
 * The layout mirrors that route deliberately. It is not shared code: the route
 * runs in Satori, which supports only a narrow subset of CSS and requires
 * explicit `display: flex` on every node, so the two are kept in step by hand.
 * The fitting rules are the exception — both call the same helpers, so a name
 * or description that shrinks on the image shrinks here too.
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
        <span className="grid aspect-square w-[9%] shrink-0 place-items-center rounded-[22%] bg-white text-[3cqw] font-bold text-[#09090b]">
          {settings.monogram}
        </span>

        <div className="min-w-0">
          <p
            className="font-extrabold leading-[1.05] tracking-[-0.055em]"
            style={{
              fontSize: `${(11 * ogCardNameScale(settings.name)).toFixed(2)}cqw`,
            }}
          >
            {settings.name}
          </p>
          <p className="mt-[3%] text-[3.4cqw] leading-[1.4] text-white/70">
            {ogCardDescription(settings.description)}
          </p>
        </div>
      </div>
    </div>
  );
}
