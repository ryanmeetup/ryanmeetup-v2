import type { HTMLAttributes, ReactNode } from "react";

export type IconBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizeStyles = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };

const IconBadge = ({
  children,
  className,
  size = "md",
  ...props
}: IconBadgeProps) => (
  <span
    {...props}
    className={`flex shrink-0 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black ${sizeStyles[size]} ${className ?? ""}`}
  >
    {children}
  </span>
);

export { IconBadge };
