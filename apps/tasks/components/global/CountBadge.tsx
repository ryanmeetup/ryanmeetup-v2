import type { ReactNode } from "react";

export function CountBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/10 px-1.5 text-[10px] font-semibold leading-none tabular-nums tracking-normal text-black/60 dark:bg-white/10 dark:text-white/60 ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
