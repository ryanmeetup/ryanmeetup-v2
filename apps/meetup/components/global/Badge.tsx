// Types
import type { ReactNode } from "react";

type BadgeVariant = "primary" | "secondary" | "neutral";
type BadgeSize = "sm" | "md";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] tracking-[0.35em]",
  md: "text-xs font-semibold tracking-[0.3em]",
};

const variantStyles: Record<BadgeVariant, string> = {
  primary: "border-white/30 bg-black/60 text-white",
  secondary: "border-white/20 bg-black/50 text-white/90",
  neutral:
    "border-black/10 bg-white/80 text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70",
};

const Badge = (props: BadgeProps) => {
  const { children, className, variant = "primary", size = "sm" } = props;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 uppercase ${sizeStyles[size]} ${variantStyles[variant]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
};

export { Badge };
