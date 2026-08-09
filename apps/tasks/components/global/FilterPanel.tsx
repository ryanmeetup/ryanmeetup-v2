"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatedCollapse, Card } from "@ryanmeetup/ui";
import { FiChevronDown, FiFilter } from "react-icons/fi";

const storageKey = "ryanmeetup.tasks.filters-expanded";

export function FilterPanel({
  children,
  count,
  className,
}: {
  children: ReactNode;
  count: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) setExpanded(saved === "true");
    });
  }, []);

  function toggle() {
    setExpanded((current) => {
      const next = !current;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  return (
    <Card size="none" className={className}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded-2xl p-4 text-left text-xs font-semibold uppercase tracking-widest text-black/50 transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:text-white/50 dark:hover:text-white dark:focus-visible:ring-white/30"
      >
        <FiFilter aria-hidden />
        Filters
        {count > 0 && (
          <b className="grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] text-white dark:bg-white dark:text-black">
            {count}
          </b>
        )}
        <FiChevronDown
          aria-hidden
          className={`ml-auto transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatedCollapse open={expanded}>
        <div className="px-4 pb-4">{children}</div>
      </AnimatedCollapse>
    </Card>
  );
}
