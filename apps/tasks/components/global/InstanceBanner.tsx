"use client";

import { useSyncExternalStore } from "react";
import { Banner, IconButton } from "@ryanmeetup/ui";
import { FiInfo, FiX } from "react-icons/fi";
import { bannerSegments, bannerText } from "@/lib/banner";
import { useInstance } from "./InstanceProvider";

const dismissalKey = "ryanmeetup.tasks.banner.dismissed.v1";
const dismissalEvent = "ryanmeetup:instance-banner-dismissed";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(dismissalEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(dismissalEvent, onStoreChange);
  };
}

function readDismissed() {
  return localStorage.getItem(dismissalKey);
}

/**
 * Whether this banner appears at all, what it says, and where it sends people
 * belong to the instance — see `lib/banner.ts`. Nothing here names a
 * deployment.
 *
 * The dismissal stores the notice that was dismissed rather than a flag,
 * because the message is editable: an owner who replaces a stale beta notice
 * with a maintenance window is announcing something new, and a plain flag
 * would hide it from everyone who had waved the old one away.
 */
export function InstanceBanner() {
  const settings = useInstance();
  const segments = bannerSegments(settings);
  const notice = bannerText(settings);
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => null);

  if (!segments || dismissed === notice) return null;

  function dismiss() {
    localStorage.setItem(dismissalKey, notice ?? "");
    window.dispatchEvent(new Event(dismissalEvent));
  }

  return (
    <Banner
      variant="info"
      icon={<FiInfo className="h-6 w-6" aria-hidden />}
      aria-label="Workspace notice"
      mobileInline
      action={
        <IconButton
          type="button"
          label="Dismiss notice"
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
