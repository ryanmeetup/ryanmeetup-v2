// Utilities
import clsx from "clsx";

// Types
import type { HTMLAttributes, ReactNode } from "react";

export type TextProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

const Text = (props: TextProps) => {
  const { className, children, ...textProps } = props;

  return (
    <p
      {...textProps}
      className={clsx(
        "text-base leading-relaxed tracking-wide text-black/70 dark:text-white/70",
        className,
      )}
    >
      {children}
    </p>
  );
};

export { Text };
