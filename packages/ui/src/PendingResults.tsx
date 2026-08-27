import type { ReactNode } from "react";
import { FiLoader } from "react-icons/fi";

/** Whether the results sit on a card or directly on the page background. */
export type PendingResultsSurface = "card" | "page";

export type PendingResultsProps = {
  /** True while the debounced query is still settling. */
  pending: boolean;
  /** Shown on the badge and announced, e.g. "Loading contacts". */
  label: string;
  /** Matches the scrim to whatever the results sit on. */
  surface?: PendingResultsSurface;
  /** `page` reads as a full-view load; `card` sits inside a panel or modal. */
  size?: "md" | "lg";
  /** For matching the corner radius of the container underneath. */
  className?: string;
  children: ReactNode;
};

const surfaceStyles: Record<PendingResultsSurface, string> = {
  card: "bg-white/80 dark:bg-[#181818]/80",
  page: "bg-[#f1f2ef]/80 dark:bg-[#101010]/80",
};

const sizeStyles = {
  md: { scrim: "min-h-40", badge: "px-5 py-3 text-sm", icon: "h-5 w-5" },
  lg: { scrim: "min-h-56", badge: "px-6 py-4 text-base", icon: "h-6 w-6" },
} as const;

/**
 * Covers a set of results while a debounced query catches up.
 *
 * The results underneath stay mounted so the layout does not jump, but they
 * are dimmed and made inert: what is on screen is one keystroke out of date,
 * and clicking a stale row would act on the wrong thing.
 */
const PendingResults = ({
  pending,
  label,
  surface = "card",
  size = "md",
  className,
  children,
}: PendingResultsProps) => {
  const styles = sizeStyles[size];
  return (
    <div className="relative" aria-busy={pending}>
      {pending && (
        <div
          role="status"
          className={`absolute inset-0 z-10 grid place-items-center rounded-xl backdrop-blur-sm ${styles.scrim} ${surfaceStyles[surface]} ${className ?? ""}`}
        >
          <span
            className={`flex items-center gap-3 rounded-xl border border-black/15 bg-white font-semibold shadow-lg dark:border-white/15 dark:bg-[#181818] ${styles.badge}`}
          >
            <FiLoader
              aria-hidden
              className={`animate-spin motion-reduce:animate-none ${styles.icon}`}
            />
            {label}
          </span>
        </div>
      )}
      <div
        className={
          pending
            ? "pointer-events-none opacity-55 transition-opacity"
            : "transition-opacity"
        }
      >
        {children}
      </div>
    </div>
  );
};

export { PendingResults };
