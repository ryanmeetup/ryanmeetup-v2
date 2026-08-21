import type { Category } from "@/lib/resources/resource-types";

export function TaskCategoryBadge({
  category,
  tags = [],
}: {
  category: Category;
  tags?: string[];
}) {
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1"
      aria-label={`${category.name} category${tags.length > 0 ? `; tags: ${tags.join(", ")}` : ""}`}
    >
      <span
        aria-hidden="true"
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/70 dark:text-white/75"
        style={{
          borderColor: `${category.color}66`,
          backgroundColor: `${category.color}22`,
        }}
      >
        <i
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        {category.name}
      </span>
      {tags.map((tag) => (
        <span
          key={tag}
          aria-hidden="true"
          className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-black/60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65"
        >
          {tag}
        </span>
      ))}
    </span>
  );
}
