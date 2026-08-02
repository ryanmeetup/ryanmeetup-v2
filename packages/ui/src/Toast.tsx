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
      containerStyle={{ bottom: 24 }}
      toastOptions={{
        duration,
        className:
          "!rounded-xl !border !border-black/10 !bg-white !px-4 !py-3 !font-semibold !text-black !shadow-xl dark:!border-white/15 dark:!bg-zinc-900 dark:!text-white",
        success: {
          iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
        },
        error: {
          duration: Math.max(duration, 5000),
          iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
        },
      }}
    />
  );
}

export { ToastHost, toast };
