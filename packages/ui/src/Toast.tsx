"use client";

import type { ReactNode } from "react";
import {
  Toaster,
  toast as hotToast,
  type ToastOptions,
} from "react-hot-toast";

export type ToastHostProps = {
  duration?: number;
};

function ToastHost({ duration = 4000 }: ToastHostProps) {
  return (
    <Toaster
      position="bottom-center"
      gutter={8}
      containerStyle={{ bottom: 24, zIndex: 100 }}
      toastOptions={{
        duration,
        className:
          "!rounded-xl !border !border-black/10 !bg-white !px-4 !py-3 !font-semibold !text-black !shadow-xl dark:!border-white/15 dark:!bg-zinc-900 dark:!text-white",
        success: {
          className:
            "!rounded-xl !border !border-emerald-500/35 !bg-emerald-50 !px-4 !py-3 !font-semibold !text-emerald-800 !shadow-xl dark:!border-emerald-400/35 dark:!bg-emerald-950 dark:!text-emerald-100",
          iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
        },
        error: {
          duration: Math.max(duration, 5000),
          className:
            "!rounded-xl !border !border-red-500/35 !bg-red-50 !px-4 !py-3 !font-semibold !text-red-800 !shadow-xl dark:!border-red-400/35 dark:!bg-red-950 dark:!text-red-100",
          iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
        },
      }}
    />
  );
}

function LinkedToastMessage({
  children,
  href,
  linkLabel,
}: {
  children: ReactNode;
  href: string;
  linkLabel: ReactNode;
}) {
  return (
    <span>
      {children}{" "}
      <a
        className="underline decoration-current/50 underline-offset-2 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        href={href}
      >
        {linkLabel}
      </a>
    </span>
  );
}

const toast = Object.assign(hotToast, {
  successWithLink(
    message: ReactNode,
    {
      href,
      linkLabel,
      ...options
    }: ToastOptions & { href: string; linkLabel: ReactNode },
  ) {
    return hotToast.success(
      <LinkedToastMessage href={href} linkLabel={linkLabel}>
        {message}
      </LinkedToastMessage>,
      options,
    );
  },
});

export { ToastHost, toast };
