// Utilities
import clsx from "clsx";

// Types
import type { ReactNode } from "react";

type KickerProps = {
  className?: string;
  children: ReactNode;
};

const Kicker = (props: KickerProps) => {
  const { className, children } = props;

  return (
    <p
      className={clsx(
        "text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70",
        className,
      )}
    >
      {children}
    </p>
  );
};

export { Kicker };
