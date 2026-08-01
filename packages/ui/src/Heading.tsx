// Utilities
import clsx from "clsx";

// Types
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type HeadingProps = Omit<ComponentPropsWithoutRef<"h1">, "children"> & {
  size?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  variant?: "ryan" | "normal";
  className?: string;
  children: ReactNode;
  bold?: boolean;
  ignoreColorMode?: boolean;
};

const getVariantClasses = (variant: string, bold: boolean) => {
  const fontWeight = clsx([bold && "font-bold", !bold && "font-base"]);

  const fontFace = clsx([
    variant === "ryan" && "font-cooper",
    variant === "normal" && "font-sans",
  ]);

  return clsx([fontWeight, fontFace]);
};

const Heading = (props: HeadingProps) => {
  const {
    size = "h1",
    className,
    children,
    variant = "ryan",
    bold = false,
    ignoreColorMode = false,
    ...headingProps
  } = props;

  const Component = size as ElementType;

  return (
    <Component
      {...headingProps}
      className={clsx(
        "tracking-wider",
        getVariantClasses(variant, bold),
        !ignoreColorMode && "text-black dark:text-white",
        className,
      )}
    >
      {children}
    </Component>
  );
};

export { Heading };
