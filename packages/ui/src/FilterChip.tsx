import type { ButtonHTMLAttributes, ReactNode } from "react";

export type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  active: boolean;
};

const FilterChip = ({
  children,
  active,
  className,
  ...props
}: FilterChipProps) => (
  <button
    {...props}
    type="button"
    aria-pressed={active}
    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30 ${active ? "border-black/80 bg-black text-white dark:border-white/80 dark:bg-white dark:text-black" : "border-black/10 bg-white/80 text-black/70 hover:border-black/30 dark:border-white/10 dark:bg-white/10 dark:text-white/70 dark:hover:border-white/40"} ${className ?? ""}`}
  >
    {children}
  </button>
);

export type FilterChipGroupProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

const FilterChipGroup = ({
  label,
  options,
  value,
  onChange,
}: FilterChipGroupProps) => (
  <div className="flex flex-wrap items-center gap-3">
    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70">
      {label}
    </span>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <FilterChip
          key={option}
          active={option === value}
          onClick={() => onChange(option)}
        >
          {option}
        </FilterChip>
      ))}
    </div>
  </div>
);

export { FilterChip, FilterChipGroup };
