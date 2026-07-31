// Components
import NextLink from "next/link";

// Types
import type { ReactNode } from "react";

type ButtonLinkProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
  href: string;
  newTab?: boolean;
  download?: boolean | string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

type ButtonProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm",
};

const getBaseClasses = (
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
) => {
  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-lg font-semibold uppercase tracking-[0.2em] transition focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 group";

  const width = fullWidth ? "w-full" : "w-auto";

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "border border-black/60 bg-black text-white shadow-lg hover:border-black/80 hover:bg-black/90 hover:-translate-y-0.5 dark:border-white/10 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:hover:text-black",
    secondary:
      "border border-black/20 bg-white/80 text-black hover:border-black/40 hover:bg-black/5 hover:shadow-sm dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/10",
    outline:
      "border border-black/60 bg-black/80 text-white hover:border-black/80 hover:bg-black/70 dark:border-white/20 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/10",
    ghost:
      "text-black dark:text-white bg-transparent border-none shadow-none hover:text-black/70 dark:hover:text-white/70",
  };

  return `${base} ${sizeStyles[size]} ${variantStyles[variant]} ${width}`;
};

const ButtonContent = (props: {
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) => {
  const { children, leftIcon, rightIcon } = props;

  return (
    <>
      {leftIcon && <span className="text-base">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="text-base">{rightIcon}</span>}
    </>
  );
};

const ButtonLink = (props: ButtonLinkProps) => {
  const {
    children,
    className,
    leftIcon,
    rightIcon,
    disabled = false,
    href,
    newTab = true,
    download,
    variant = "primary",
    size = "md",
    fullWidth = false,
  } = props;

  return (
    <NextLink
      className={`${getBaseClasses(variant, size, fullWidth)} ${
        disabled ? "pointer-events-none opacity-60" : ""
      } ${className ?? ""}`}
      href={href}
      target={newTab ? "_blank" : "_self"}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      download={download}
    >
      {variant === "primary" && !disabled && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-0.5 rounded-lg opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 bg-[conic-gradient(from_180deg,_rgba(0,0,0,0.2),_rgba(0,0,0,0.05),_rgba(0,0,0,0.2))] dark:bg-[conic-gradient(from_180deg,_rgba(255,255,255,0.25),_rgba(255,255,255,0.05),_rgba(255,255,255,0.25))]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.2),_transparent_60%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 ring-2 ring-black/30 dark:ring-white/30 animate-pulse"
          />
        </>
      )}
      <ButtonContent leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </ButtonContent>
    </NextLink>
  );
};

const Button = (props: ButtonProps) => {
  const {
    children,
    className,
    onClick,
    leftIcon,
    rightIcon,
    disabled = false,
    variant = "primary",
    size = "md",
    fullWidth = false,
  } = props;

  return (
    <button
      className={`${getBaseClasses(variant, size, fullWidth)} ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className ?? ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {variant === "primary" && !disabled && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-0.5 rounded-lg opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 bg-[conic-gradient(from_180deg,_rgba(0,0,0,0.2),_rgba(0,0,0,0.05),_rgba(0,0,0,0.2))] dark:bg-[conic-gradient(from_180deg,_rgba(255,255,255,0.25),_rgba(255,255,255,0.05),_rgba(255,255,255,0.25))]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.2),_transparent_60%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 ring-2 ring-black/30 dark:ring-white/30 animate-pulse"
          />
        </>
      )}
      <ButtonContent leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </ButtonContent>
    </button>
  );
};

Button.Link = ButtonLink;

export { Button };
