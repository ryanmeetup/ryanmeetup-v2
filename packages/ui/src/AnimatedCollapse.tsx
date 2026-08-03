import type { HTMLAttributes, ReactNode } from "react";

export type AnimatedCollapseProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: ReactNode;
  contentClassName?: string;
  open: boolean;
};

export function AnimatedCollapse({
  children,
  className,
  contentClassName,
  open,
  ...props
}: AnimatedCollapseProps) {
  return (
    <div
      {...props}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
        open
          ? "grid-rows-[1fr] opacity-100"
          : "pointer-events-none grid-rows-[0fr] opacity-0"
      } ${className ?? ""}`}
    >
      <div
        inert={!open}
        className={`min-h-0 overflow-hidden ${contentClassName ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}
