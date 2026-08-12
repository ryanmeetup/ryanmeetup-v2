"use client";

import { useSyncExternalStore } from "react";
import { Banner, IconButton } from "@ryanmeetup/ui";
import { FiInfo, FiX } from "react-icons/fi";

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

export function BetaBanner() {
  const visible = useSyncExternalStore(subscribe, isVisible, () => true);

  if (!visible) return null;

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
        Tasks is in beta. Found an issue or have an idea? Contact Ryan or file
        a task in <code>tasks.ryanmeetup.com</code>.
      </p>
    </Banner>
  );
}
