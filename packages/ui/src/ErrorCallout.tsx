import { FiAlertCircle } from "react-icons/fi";
import type { ReactNode } from "react";

export type ErrorCalloutProps = {
  children?: ReactNode;
  className?: string;
};

export function ErrorCallout({ children, className }: ErrorCalloutProps) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm font-semibold leading-relaxed text-red-700 dark:border-red-400/35 dark:bg-red-950/45 dark:text-red-200 ${className ?? ""}`}
    >
      <FiAlertCircle aria-hidden className="mt-0.5 shrink-0 text-lg" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
