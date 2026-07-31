import type { ReactNode } from "react";

type IconBadgeProps = {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeStyles = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const IconBadge = (props: IconBadgeProps) => {
  const { children, className, size = "md" } = props;

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black ${sizeStyles[size]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
};

export { IconBadge };
