"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { FiCheck, FiChevronDown, FiMinus, FiPlus } from "react-icons/fi";
import {
  Avatar,
  getFilterControlClasses,
  type AvatarProps,
} from "@ryanmeetup/ui";

export type InclusionFilterOption = {
  avatar?: AvatarProps;
  label: string;
  value: string;
  markerColor?: string | null;
};

export function InclusionFilterMenu({
  label,
  anyLabel,
  options,
  includedValues,
  excludedValues,
  onIncludedChange,
  onExcludedChange,
}: {
  label: string;
  anyLabel: string;
  options: InclusionFilterOption[];
  includedValues: string[];
  excludedValues: string[];
  onIncludedChange: (values: string[]) => void;
  onExcludedChange: (values: string[]) => void;
}) {
  const included = new Set(includedValues);
  const excluded = new Set(excludedValues);
  const active = included.size > 0 || excluded.size > 0;
  const summary = active
    ? [
        included.size ? `${included.size} included` : "",
        excluded.size ? `${excluded.size} excluded` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : anyLabel;

  function include(value: string) {
    onIncludedChange(
      included.has(value)
        ? includedValues.filter((item) => item !== value)
        : [...includedValues, value],
    );
    if (excluded.has(value))
      onExcludedChange(excludedValues.filter((item) => item !== value));
  }

  function exclude(value: string) {
    onExcludedChange(
      excluded.has(value)
        ? excludedValues.filter((item) => item !== value)
        : [...excludedValues, value],
    );
    if (included.has(value))
      onIncludedChange(includedValues.filter((item) => item !== value));
  }

  return (
    <Popover className="relative shrink-0">
      <PopoverButton className={getFilterControlClasses(active)}>
        <span className="text-black/50 dark:text-white/50">{label}</span>
        <span>{summary}</span>
        <FiChevronDown
          aria-hidden
          className="text-black/40 dark:text-white/40"
        />
      </PopoverButton>
      <PopoverPanel
        anchor={{ to: "bottom start", padding: 16 }}
        className="z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-black/10 bg-white/95 p-2 text-black shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#181818]/95 dark:text-white"
      >
        <div className="flex items-center px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
          <span className="flex-1">{label}</span>
          <span className="w-16 text-center">Include</span>
          <span className="w-16 text-center">Exclude</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {option.avatar && <Avatar {...option.avatar} size="sm" />}
              {option.markerColor && (
                <i
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: option.markerColor }}
                />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {option.label}
              </span>
              <button
                type="button"
                aria-label={`${included.has(option.value) ? "Stop including" : "Include"} ${option.label}`}
                aria-pressed={included.has(option.value)}
                onClick={() => include(option.value)}
                className="grid h-8 w-16 place-items-center rounded-md border border-transparent text-black/45 transition hover:bg-black/10 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 aria-pressed:border-emerald-500/30 aria-pressed:bg-emerald-500/15 aria-pressed:text-emerald-700 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/30 dark:aria-pressed:text-emerald-300"
              >
                {included.has(option.value) ? <FiCheck /> : <FiPlus />}
              </button>
              <button
                type="button"
                aria-label={`${excluded.has(option.value) ? "Stop excluding" : "Exclude"} ${option.label}`}
                aria-pressed={excluded.has(option.value)}
                onClick={() => exclude(option.value)}
                className="grid h-8 w-16 place-items-center rounded-md border border-transparent text-black/45 transition hover:bg-black/10 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 aria-pressed:border-red-500/30 aria-pressed:bg-red-500/15 aria-pressed:text-red-700 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/30 dark:aria-pressed:text-red-300"
              >
                <FiMinus />
              </button>
            </div>
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  );
}
