import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  size?: "sm" | "md";
  variant?: "subtle" | "overlay" | "plain" | "danger";
};

const sizeStyles = { sm: "h-8 w-8", md: "h-10 w-10" };
const variantStyles = {
  subtle:
    "rounded-full border border-black/10 text-black hover:bg-black/5 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30",
  overlay:
    "rounded-full border border-white/50 bg-black/70 text-white shadow-lg backdrop-blur hover:bg-black/85 focus-visible:ring-white/80",
  plain:
    "rounded text-black hover:scale-125 focus-visible:ring-black/30 dark:text-white dark:focus-visible:ring-white/30",
  danger:
    "rounded-full border border-red-500/20 text-red-600 hover:-translate-y-0.5 hover:border-red-500/40 hover:bg-red-50 hover:shadow-sm focus-visible:ring-red-500/30 active:translate-y-0 motion-reduce:transform-none dark:border-red-400/25 dark:text-red-400 dark:hover:border-red-400/50 dark:hover:bg-red-950/40 dark:focus-visible:ring-red-400/30",
};

const IconButton = ({
  children,
  className,
  label,
  size = "sm",
  variant = "subtle",
  type = "button",
  ...buttonProps
}: IconButtonProps) => (
  <button
    {...buttonProps}
    type={type}
    aria-label={label}
    className={`inline-flex items-center justify-center transition duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 ${sizeStyles[size]} ${variantStyles[variant]} ${className ?? ""}`}
  >
    {children}
  </button>
);

export { IconButton };
