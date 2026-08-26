"use client";

import { useSyncExternalStore } from "react";
import { Banner, IconButton } from "@ryanmeetup/ui";
import { FiInfo, FiX } from "react-icons/fi";
import { betaBannerSegments } from "@/lib/beta-banner";
import { useInstance } from "./InstanceProvider";

const dismissalKey = "ryanmeetup.tasks.beta-banner.dismissed.v1";
const dismissalEvent = "ryanmeetup:beta-banner-dismissed";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(dismissalEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(dismissalEvent, onStoreChange);
  };
}

function isVisible() {
  return localStorage.getItem(dismissalKey) !== "true";
}

/**
 * Whether this banner appears at all, and where it sends people, belong to the
 * instance — see `lib/beta-banner.ts`. Nothing here names a deployment.
 */
export function BetaBanner() {
  const segments = betaBannerSegments(useInstance());
  const dismissed = !useSyncExternalStore(subscribe, isVisible, () => true);

  if (!segments || dismissed) return null;

  function dismiss() {
    localStorage.setItem(dismissalKey, "true");
    window.dispatchEvent(new Event(dismissalEvent));
  }

  return (
    <Banner
      variant="info"
      icon={<FiInfo className="h-6 w-6" aria-hidden />}
      aria-label="Beta notice"
      mobileInline
      action={
        <IconButton
          type="button"
          label="Dismiss beta notice"
          onClick={dismiss}
          className="text-white hover:bg-white/15 focus-visible:ring-white/70 dark:text-white"
        >
          <FiX aria-hidden />
        </IconButton>
      }
    >
      <p>
        {segments.map((segment, index) =>
          segment.kind === "link" ? (
            <a
              key={index}
              href={segment.href}
              // A mailto hands off to a mail client, which must not be asked
              // to open in a new tab.
              target={segment.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              className="font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {segment.value}
            </a>
          ) : (
            <span key={index}>{segment.value}</span>
          ),
        )}
      </p>
    </Banner>
  );
}
