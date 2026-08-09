"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { FiCheck, FiChevronDown, FiMinus, FiPlus } from "react-icons/fi";
import type { Category } from "@/lib/types";

export function CategoryFilterMenu({
  categories,
  excludedIds,
  includedIds,
  onExcludedChange,
  onIncludedChange,
}: {
  categories: Category[];
  excludedIds: string[];
  includedIds: string[];
  onExcludedChange: (ids: string[]) => void;
  onIncludedChange: (ids: string[]) => void;
}) {
  const included = new Set(includedIds);
  const excluded = new Set(excludedIds);
  const summary =
    included.size === 0 && excluded.size === 0
      ? "Any category"
      : [
          included.size ? `${included.size} included` : "",
          excluded.size ? `${excluded.size} excluded` : "",
        ]
          .filter(Boolean)
          .join(" · ");

  function include(id: string) {
    onIncludedChange(
      included.has(id)
        ? includedIds.filter((value) => value !== id)
        : [...includedIds, id],
    );
  }

  function exclude(id: string) {
    onExcludedChange(
      excluded.has(id)
        ? excludedIds.filter((value) => value !== id)
        : [...excludedIds, id],
    );
  }

  return (
    <Popover className="relative shrink-0">
      <PopoverButton className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30">
        <span className="text-black/50 dark:text-white/50">Category</span>
        <span>{summary}</span>
        <FiChevronDown aria-hidden className="text-black/40 dark:text-white/40" />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        className="z-50 mt-2 w-80 rounded-xl border border-black/10 bg-white/95 p-2 text-black shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#181818]/95 dark:text-white"
      >
        <div className="flex items-center px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
          <span className="flex-1">Category</span>
          <span className="w-16 text-center">Include</span>
          <span className="w-16 text-center">Exclude</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <i
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {category.name}
              </span>
              <button
                type="button"
                aria-label={`${included.has(category.id) ? "Stop including" : "Include"} ${category.name}`}
                aria-pressed={included.has(category.id)}
                onClick={() => include(category.id)}
                className="grid h-8 w-16 place-items-center rounded-md border border-transparent text-black/45 transition hover:bg-black/10 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 aria-pressed:border-emerald-500/30 aria-pressed:bg-emerald-500/15 aria-pressed:text-emerald-700 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/30 dark:aria-pressed:text-emerald-300"
              >
                {included.has(category.id) ? <FiCheck /> : <FiPlus />}
              </button>
              <button
                type="button"
                aria-label={`${excluded.has(category.id) ? "Stop excluding" : "Exclude"} ${category.name}`}
                aria-pressed={excluded.has(category.id)}
                onClick={() => exclude(category.id)}
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
