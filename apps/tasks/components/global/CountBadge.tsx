import type { ReactNode } from "react";

const sizeStyles = {
  sm: "h-6 min-w-6 px-1.5 text-[11px] sm:h-7 sm:min-w-7 sm:px-2 sm:text-xs",
  // Scales with the heading it sits beside so the circle stays near cap height
  // instead of towering over the display type.
  lg: "h-[1.95em] min-w-[1.95em] px-[0.5em] align-middle text-[0.44em]",
} as const;

export function CountBadge({
  children,
  className,
  size = "sm",
}: {
  children: ReactNode;
  className?: string;
  size?: keyof typeof sizeStyles;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-black/10 font-sans font-semibold normal-case leading-none tabular-nums tracking-normal text-black/60 dark:bg-white/10 dark:text-white/60 ${sizeStyles[size]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
