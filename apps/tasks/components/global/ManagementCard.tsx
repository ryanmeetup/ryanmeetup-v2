import type { ReactNode } from "react";

export function ManagementCardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`block truncate text-lg font-semibold leading-tight ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function ManagementCard({
  body,
  children,
  className,
  footer,
  footerClassName = "justify-end",
}: {
  body?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  footerClassName?: string;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-xl border border-black/15 bg-black/[0.035] px-4 py-3 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-white/[0.025] dark:shadow-none ${className ?? ""}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-3">{children}</div>
        {body && <div className="mt-2 min-w-0">{body}</div>}
      </div>
      {footer && (
        <div
          className={`mt-3 flex min-w-0 items-center gap-3 border-t border-black/10 pt-3 dark:border-white/10 ${footerClassName}`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
