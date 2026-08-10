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

export type MultiSelectOption = {
  avatar?: AvatarProps;
  label: string;
  value: string;
};

export type MultiSelectProps = {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
};

const MultiSelect = ({
  label,
  options,
  value,
  onChange,
  className,
  disabled = false,
  placeholder = "Select options",
  required = false,
}: MultiSelectProps) => {
  const buttonId = useId();
  const selectedOptions = options.filter((option) =>
    value.includes(option.value),
  );
  const selectedLabels = selectedOptions.map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;

  return (
    <Listbox
      as="div"
      multiple
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`flex min-w-0 flex-col gap-2 ${className ?? ""}`}
    >
      <label className={getFieldLabelClasses()} htmlFor={buttonId}>
        <span>{label}</span>
        {required && <span className="shrink-0 text-red-500">*</span>}
      </label>
      <ListboxButton
        id={buttonId}
        aria-required={required}
        className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:focus-visible:ring-white/30"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {selectedOptions.some((option) => option.avatar) && (
            <span className="flex shrink-0 -space-x-1" aria-hidden>
              {selectedOptions
                .filter((option) => option.avatar)
                .slice(0, 3)
                .map((option) => (
                  <Avatar
                    key={option.value}
                    {...option.avatar}
                    size="sm"
                    className={`-my-1 ring-1 ring-white dark:ring-[#303030] ${option.avatar?.className ?? ""}`}
                  />
                ))}
            </span>
          )}
          <span
            className={`truncate ${selectedLabels.length === 0 ? "font-normal text-black/50 dark:text-white/50" : ""}`}
          >
            {summary}
          </span>
        </span>
        <FiChevronDown
          aria-hidden
          className="shrink-0 text-black/40 dark:text-white/40"
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
          className="z-[60] mt-2 flex max-h-64 w-[var(--button-width)] origin-top flex-col gap-1 overflow-y-auto rounded-xl border border-black/10 bg-white/95 p-1.5 text-black shadow-xl backdrop-blur focus:outline-none dark:border-white/10 dark:bg-[#181818]/95 dark:text-white"
        >
          {options.map((option) => (
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

export { MultiSelect };
