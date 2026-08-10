import { FiLayers, FiUsers } from "react-icons/fi";

export function AccessGroupKindBadge({ kind }: { kind: "tier" | "team" }) {
  if (kind === "tier") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-200">
        <FiLayers aria-hidden className="text-sm" />
        Tier
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-200">
      <FiUsers aria-hidden className="text-sm" />
      Team
    </span>
  );
}
