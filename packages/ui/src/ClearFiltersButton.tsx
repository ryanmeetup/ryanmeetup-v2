import type { ButtonHTMLAttributes } from "react";
import { FiRotateCcw } from "react-icons/fi";

export type ClearFiltersButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  label?: string;
};

const ClearFiltersButton = ({
  className,
  label = "Clear filters",
  type = "button",
  ...props
}: ClearFiltersButtonProps) => (
  <button
    {...props}
    type={type}
    className={`group/clear inline-flex shrink-0 items-center gap-1.5 rounded-sm px-1 py-2 text-xs font-medium text-black/60 underline decoration-black/20 underline-offset-4 transition hover:text-black hover:decoration-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/60 dark:decoration-white/20 dark:hover:text-white dark:hover:decoration-white/60 dark:focus-visible:ring-white/30 ${className ?? ""}`}
  >
    <FiRotateCcw
      aria-hidden
      className="transition-transform duration-300 group-hover/clear:-rotate-45 motion-reduce:transition-none"
    />
    <span>{label}</span>
  </button>
);

export { ClearFiltersButton };
