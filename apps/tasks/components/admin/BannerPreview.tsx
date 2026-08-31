"use client";

import { Banner, IconButton } from "@ryanmeetup/ui";
import { FiInfo, FiX } from "react-icons/fi";
import { bannerSegments } from "@/lib/banner";
import type { InstanceSettings } from "@/lib/instance";

/**
 * The banner as members will see it, or the empty state when the instance has
 * turned it off or left it without anything to say. Deliberately inert: the
 * links are text, and the dismiss control is decorative, so the preview cannot
 * navigate anyone away.
 */
export function BannerPreview({ settings }: { settings: InstanceSettings }) {
  const segments = bannerSegments(settings);

  if (!segments)
    return (
      <p className="rounded-xl border border-dashed border-black/15 p-4 text-sm text-black/55 dark:border-white/15 dark:text-white/55">
        {settings.bannerEnabled
          ? "The banner has nothing to say. Members see the workspace with nothing above it."
          : "The banner is off. Members see the workspace with nothing above it."}
      </p>
    );

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
      <Banner
        variant="info"
        icon={<FiInfo className="h-6 w-6" aria-hidden />}
        aria-hidden
        mobileInline
        className="border-b-0"
        action={
          <IconButton
            type="button"
            label="Dismiss notice"
            tooltip={false}
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none text-white dark:text-white"
          >
            <FiX aria-hidden />
          </IconButton>
        }
      >
        <p>
          {segments.map((segment, index) => (
            <span
              key={index}
              className={
                segment.kind === "link"
                  ? "font-semibold underline underline-offset-2"
                  : undefined
              }
            >
              {segment.value}
            </span>
          ))}
        </p>
      </Banner>
    </div>
  );
}
