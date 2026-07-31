// Types
import type { ReactNode } from "react";

type PillProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "subtle";
};

const Pill = (props: PillProps) => {
  const { children, className, variant = "default" } = props;

  const baseStyles =
    "inline-flex items-center justify-center rounded-full border text-xs uppercase";
  const variantStyles = {
    default:
      "border-black/20 bg-white/90 px-4 py-1 font-semibold tracking-[0.3em] text-black/80 shadow-sm dark:border-white/25 dark:bg-white/15 dark:text-white/85",
    subtle:
      "border-black/10 bg-white/80 px-3 py-1 font-normal tracking-[0.2em] text-black/70 shadow-none dark:border-white/15 dark:bg-white/5 dark:text-white/70",
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
};

export { Pill };
