import { FiCheckCircle } from "react-icons/fi";
import type { ReactNode } from "react";

export type SuccessCalloutProps = {
  children?: ReactNode;
  className?: string;
};

export function SuccessCallout({ children, className }: SuccessCalloutProps) {
  if (!children) return null;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm font-semibold leading-relaxed text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-950/45 dark:text-emerald-100 ${className ?? ""}`}
    >
      <FiCheckCircle aria-hidden className="mt-0.5 shrink-0 text-lg" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
