// Types
import { forwardRef } from "react";
import type { ReactNode } from "react";

type CardVariant = "soft" | "solid" | "outline";
type CardSize = "sm" | "md" | "lg";

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  size?: CardSize;
  hover?: boolean;
};

const variantStyles: Record<CardVariant, string> = {
  soft: "bg-white/80 dark:bg-white/5",
  solid: "bg-white/90 dark:bg-white/5",
  outline: "bg-transparent",
};

const sizeStyles: Record<CardSize, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

const Card = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  const {
    children,
    className,
    variant = "soft",
    size = "md",
    hover = false,
  } = props;

  return (
    <div
      ref={ref}
      className={[
        "rounded-2xl border border-black/10 shadow-sm dark:border-white/10",
        variantStyles[variant],
        sizeStyles[size],
        hover
          ? "transition hover:-translate-y-1 hover:border-black/30 dark:hover:border-white/40"
          : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";

export { Card };
