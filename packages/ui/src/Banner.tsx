import type { HTMLAttributes, ReactNode } from "react";

export type BannerVariant = "brand" | "info" | "warning" | "neutral";

export type BannerProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  variant?: BannerVariant;
  icon?: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  contentClassName?: string;
};

const variantClasses: Record<BannerVariant, string> = {
  brand: "border-indigo-400/30 bg-[#1d1b7a] text-white",
  info: "border-blue-500/30 bg-blue-600 text-white dark:bg-blue-700",
  warning:
    "border-amber-300/50 bg-amber-50 text-amber-950 dark:border-amber-300/20 dark:bg-amber-950 dark:text-amber-50",
  neutral:
    "border-black/10 bg-white text-black dark:border-white/10 dark:bg-[#181818] dark:text-white",
};

export function Banner({
  variant = "neutral",
  icon,
  title,
  action,
  compact = false,
  children,
  className,
  contentClassName,
  ...props
}: BannerProps) {
  return (
    <aside
      {...props}
      className={`border-b font-medium shadow-sm ${variantClasses[variant]} ${compact ? "px-2 py-1 text-xs" : "px-4 py-3 text-sm sm:px-6 lg:px-8"} ${className ?? ""}`}
    >
      <div
        className={`flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${contentClassName ?? ""}`}
      >
        <div className="flex min-w-0 items-start gap-2 text-left">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <div className="min-w-0">
            {title && <p className="font-semibold">{title}</p>}
            {children && <div>{children}</div>}
          </div>
        </div>
        {action && <div className="shrink-0 self-end sm:self-auto">{action}</div>}
      </div>
    </aside>
  );
}
