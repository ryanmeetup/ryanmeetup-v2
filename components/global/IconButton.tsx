import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  size?: "sm" | "md";
  variant?: "subtle" | "overlay" | "plain";
};

const sizeStyles = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

const variantStyles = {
  subtle:
    "rounded-full border border-black/10 text-black hover:bg-black/5 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30",
  overlay:
    "rounded-full border border-white/50 bg-black/70 text-white shadow-lg backdrop-blur hover:bg-black/85 focus-visible:ring-white/80",
  plain:
    "rounded text-black hover:scale-125 focus-visible:ring-black/30 dark:text-white dark:focus-visible:ring-white/30",
};

const IconButton = (props: IconButtonProps) => {
  const {
    children,
    className,
    label,
    size = "sm",
    variant = "subtle",
    type = "button",
    ...buttonProps
  } = props;

  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={label}
      className={`inline-flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 ${sizeStyles[size]} ${variantStyles[variant]} ${className ?? ""}`}
    >
      {children}
    </button>
  );
};

export { IconButton };
