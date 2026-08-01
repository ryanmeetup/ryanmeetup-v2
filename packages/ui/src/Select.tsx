import { FaChevronDown as ChevronDown } from "react-icons/fa";

import { getFieldLabelClasses } from "./fieldStyles";

type SelectOption = {
  label: string;
  value: string;
};

export type SelectProps = {
  label: string;
  name: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  variant?: "field" | "compact";
};

const Select = (props: SelectProps) => {
  const { label, name, options, value, onChange, variant = "field" } = props;
  const compact = variant === "compact";

  return (
    <label
      className={
        compact
          ? "inline-flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70 dark:text-white/70"
          : "flex flex-col gap-2"
      }
      htmlFor={name}
    >
      <span className={compact ? "" : getFieldLabelClasses()}>{label}</span>
      <span className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={
            compact
              ? "h-9 appearance-none rounded-full border border-black/20 bg-white/80 px-3 pr-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70 shadow-sm transition hover:border-black/40 dark:border-white/20 dark:bg-white/10 dark:text-white/70 dark:hover:border-white/40"
              : "h-11 w-full appearance-none rounded-lg border border-black/20 bg-white px-3 pr-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/70 shadow-sm transition focus:border-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:bg-white/10 dark:text-white/70 dark:focus:border-white/50 dark:focus:ring-white/20"
          }
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-black/70 dark:text-white/70"
        />
      </span>
    </label>
  );
};

export { Select };
export type { SelectOption };
