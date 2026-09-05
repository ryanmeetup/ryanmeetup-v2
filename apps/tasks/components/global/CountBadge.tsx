import type { ReactNode } from "react";

const sizeStyles = {
  sm: {
    base: "h-6 text-[11px] sm:h-7 sm:text-xs",
    bare: "min-w-6 px-1.5 sm:min-w-7 sm:px-2",
    labelled: "gap-1 px-2 sm:px-2.5",
  },
  // Scales with the heading it sits beside so the badge stays near cap height
  // instead of towering over the display type.
  lg: {
    base: "h-[1.95em] align-middle text-[0.44em]",
    bare: "min-w-[1.95em] px-[0.5em]",
    labelled: "gap-[0.4em] px-[0.75em]",
  },
} as const;

export function CountBadge({
  children,
  label,
  plural,
  hideLabel = false,
  className,
  size = "sm",
}: {
  children: ReactNode;
  /** Singular noun for whatever is being counted, e.g. "task". */
  label?: string;
  /** Irregular plural for `label`; defaults to `${label}s`. */
  plural?: string;
  /**
   * Keep the badge a bare number on screen — for spots where the surrounding
   * text already says what is counted — while still naming it for screen
   * readers.
   */
  hideLabel?: boolean;
  className?: string;
  size?: keyof typeof sizeStyles;
}) {
  const styles = sizeStyles[size];
  const noun = label
    ? children === 1
      ? label
      : (plural ?? `${label}s`)
    : null;
  const showNoun = noun !== null && !hideLabel;

  return (
    <span
      className={`relative inline-flex items-center justify-center whitespace-nowrap rounded-full bg-black/10 font-sans font-semibold normal-case leading-none tabular-nums tracking-normal text-black/60 dark:bg-white/10 dark:text-white/60 ${styles.base} ${showNoun ? styles.labelled : styles.bare} ${className ?? ""}`}
    >
      {children}
      {noun !== null && (
        <span className={showNoun ? undefined : "sr-only"}>
          {showNoun ? noun : ` ${noun}`}
        </span>
      )}
    </span>
  );
}
