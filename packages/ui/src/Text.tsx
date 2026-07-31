// Utilities
import clsx from "clsx";

// Types
import type { ReactNode } from "react";

type TextProps = {
  className?: string;
  children: ReactNode;
};

const Text = (props: TextProps) => {
  const { className, children } = props;

  return (
    <p
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
