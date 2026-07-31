// Utilities
import clsx from "clsx";

// Types
import type { ReactNode } from "react";

type HeadingProps = {
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
    size = "lg",
    className,
    children,
    variant = "ryan",
    bold = false,
  } = props;

  const styles = "tracking-wider";

  const renderHeading = () => {
    switch (size) {
      case "h1":
        return <h1 className={styles}>{children}</h1>;
      case "h2":
        return <h2 className={styles}>{children}</h2>;
      case "h3":
        return <h3 className={styles}>{children}</h3>;
      case "h4":
        return <h4 className={styles}>{children}</h4>;
      case "h5":
        return <h5 className={styles}>{children}</h5>;
      case "h6":
        return <h6 className={styles}>{children}</h6>;
      default:
        return <h1 className={styles}>{children}</h1>;
    }
  };

  return (
    <div className={clsx([className, getVariantClasses(variant, bold)])}>
      {renderHeading()}
    </div>
  );
};

export { Heading };
