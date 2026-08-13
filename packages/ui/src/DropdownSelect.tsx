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
import { Avatar, type AvatarProps } from "./Avatar";
import { getFieldLabelClasses } from "./fieldStyles";
import { getFilterControlClasses } from "./filterStyles";
import { useProximityOptions } from "./useProximityOptions";

export type DropdownSelectOption = {
  avatar?: AvatarProps;
  label: string;
  value: string;
  color?: string;
};

export type DropdownSelectProps = {
  label: string;
  options: DropdownSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: "compact" | "field";
  active?: boolean;
  proximityValue?: string;
};

const DropdownSelect = ({
  label,
  options,
  value,
  onChange,
  className,
  required = false,
  disabled = false,
  variant = "compact",
  active = false,
  proximityValue,
}: DropdownSelectProps) => {
  const buttonId = useId();
  const selected = options.find((option) => option.value === value);
  const field = variant === "field";
  const { orderedOptions, setAnchorElement } = useProximityOptions(
    options,
    proximityValue,
  );

  return (
    <Listbox
      as="div"
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={field ? "flex min-w-0 flex-col gap-2" : "contents"}
    >
      {field && (
        <label className={getFieldLabelClasses()} htmlFor={buttonId}>
          <span>{label}</span>
          {required && <span className="shrink-0 text-red-500">*</span>}
        </label>
      )}
      <ListboxButton
        id={buttonId}
        aria-required={required || undefined}
        className={`${field ? "inline-flex w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30" : `${getFilterControlClasses(active)} shrink-0`} disabled:cursor-not-allowed disabled:opacity-40 ${className ?? ""}`}
      >
        {!field && (
          <span className="text-black/50 dark:text-white/50">{label}</span>
        )}
        <span className="inline-flex min-w-0 items-center gap-2">
          {selected?.avatar && (
            <Avatar
              {...selected.avatar}
              size="sm"
              className={`-my-1 ${selected.avatar.className ?? ""}`}
            />
          )}
          {selected?.color && (
            <i
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
          )}
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
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
          ref={setAnchorElement}
          anchor={{ to: "bottom start", padding: 16 }}
          className={`z-50 mt-2 flex max-w-[calc(100vw-2rem)] origin-top flex-col gap-1 rounded-xl border border-black/10 bg-white/95 p-1.5 text-black shadow-xl backdrop-blur focus:outline-none dark:border-white/10 dark:bg-[#181818]/95 dark:text-white ${field ? "w-[var(--button-width)]" : "w-56"}`}
        >
          {orderedOptions.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition focus:outline-none data-focus:bg-black/5 data-selected:bg-black/5 data-selected:font-semibold dark:data-focus:bg-white/10 dark:data-selected:bg-white/10"
            >
              {option.avatar && (
                <Avatar
                  {...option.avatar}
                  size="md"
                  className={`-my-1 ${option.avatar.className ?? ""}`}
                />
              )}
              {option.color && (
                <i
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              )}
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
