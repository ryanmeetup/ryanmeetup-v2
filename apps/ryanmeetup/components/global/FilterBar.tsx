import type { ReactNode } from "react";

type FilterBarProps = {
  search: ReactNode;
  actions?: ReactNode;
  className?: string;
};

const FilterBar = (props: FilterBarProps) => {
  const { search, actions, className } = props;

  return (
    <div
      className={`flex w-full flex-col gap-4 lg:flex-row lg:items-end ${
        className ?? ""
      }`}
    >
      <div className="flex-1">{search}</div>
      {actions && <div className="w-full lg:w-auto">{actions}</div>}
    </div>
  );
};

export { FilterBar };
