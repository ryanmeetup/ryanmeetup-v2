"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { useId } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { getFieldLabelClasses } from "./fieldStyles";

export type DropdownSelectOption = {
  label: string;
  value: string;
};

export type DropdownSelectProps = {
  label: string;
  options: DropdownSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: "compact" | "field";
};

const DropdownSelect = ({
  label,
  options,
  value,
  onChange,
  className,
  variant = "compact",
}: DropdownSelectProps) => {
  const buttonId = useId();
  const selected = options.find((option) => option.value === value);
  const field = variant === "field";

  return (
    <Listbox
      as="div"
      value={value}
      onChange={onChange}
      className={field ? "flex min-w-0 flex-col gap-2" : "contents"}
    >
      {field && (
        <label className={getFieldLabelClasses()} htmlFor={buttonId}>
          {label}
        </label>
      )}
      <ListboxButton
        id={buttonId}
        className={`inline-flex items-center gap-2 rounded-lg border bg-white font-semibold text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30 ${field ? "w-full justify-between border-black/20 px-4 py-2.5 text-sm shadow-sm dark:border-white/20 dark:bg-white/10" : "shrink-0 justify-center border-black/10 px-3 py-1.5 text-xs dark:border-white/10"} ${className ?? ""}`}
      >
        {!field && (
          <span className="text-black/50 dark:text-white/50">{label}</span>
        )}
        <span>{selected?.label ?? value}</span>
        <FiChevronDown
          aria-hidden
          className="ml-auto shrink-0 text-black/40 dark:text-white/40"
        />
      </ListboxButton>
      <Transition
        enter="transition duration-150 ease-out"
        enterFrom="translate-y-1 scale-95 opacity-0"
        enterTo="translate-y-0 scale-100 opacity-100"
        leave="transition duration-100 ease-in"
        leaveFrom="translate-y-0 scale-100 opacity-100"
        leaveTo="translate-y-1 scale-95 opacity-0"
      >
        <ListboxOptions
          anchor="bottom start"
          className={`z-50 mt-2 origin-top rounded-xl border border-black/10 bg-white/95 p-1.5 text-black shadow-xl backdrop-blur focus:outline-none dark:border-white/10 dark:bg-[#181818]/95 dark:text-white ${field ? "w-[var(--button-width)]" : "w-56"}`}
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition focus:outline-none data-focus:bg-black/5 data-selected:bg-black/5 data-selected:font-semibold dark:data-focus:bg-white/10 dark:data-selected:bg-white/10"
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <FiCheck
                aria-hidden
                className="shrink-0 opacity-0 group-data-selected:opacity-100"
              />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Transition>
    </Listbox>
  );
};

export { DropdownSelect };
