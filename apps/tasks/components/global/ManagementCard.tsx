import type { ReactNode } from "react";

export function ManagementCard({
  children,
  footer,
  footerClassName = "justify-end",
}: {
  children: ReactNode;
  footer?: ReactNode;
  footerClassName?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-black/10 bg-black/[0.015] px-4 py-3 dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex items-start gap-3">{children}</div>
      {footer && (
        <div
          className={`mt-auto flex min-w-0 items-center gap-3 border-t border-black/10 pt-3 dark:border-white/10 ${footerClassName}`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
