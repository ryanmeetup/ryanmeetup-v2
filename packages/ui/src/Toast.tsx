"use client";

import { Toaster, toast } from "react-hot-toast";

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

export { ToastHost, toast };
