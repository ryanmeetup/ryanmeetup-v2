import type { HTMLAttributes, ReactNode } from "react";

export type FilterBarProps = HTMLAttributes<HTMLDivElement> & {
  search: ReactNode;
  actions?: ReactNode;
};

const FilterBar = ({
  search,
  actions,
  className,
  ...props
}: FilterBarProps) => (
  <div
    {...props}
    className={`flex w-full flex-col gap-4 lg:flex-row lg:items-end ${className ?? ""}`}
  >
    <div className="flex-1">{search}</div>
    {actions && <div className="w-full lg:w-auto">{actions}</div>}
  </div>
);

export { FilterBar };
