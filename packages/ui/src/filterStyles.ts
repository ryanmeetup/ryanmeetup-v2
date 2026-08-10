const filterControlBaseClasses =
  "inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30";

const getFilterControlClasses = (active = false) =>
  `${filterControlBaseClasses} ${
    active
      ? "border-black/60 bg-black/[0.06] shadow-sm dark:border-white/60 dark:bg-white/15"
      : "border-black/10 dark:border-white/10"
  }`;

export { getFilterControlClasses };
