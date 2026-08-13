import type { Category } from "@/lib/types";

export function TaskCategoryBadge({
  category,
  tags = [],
}: {
  category: Category;
  tags?: string[];
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/70 dark:text-white/75"
      style={{
        borderColor: `${category.color}66`,
        backgroundColor: `${category.color}22`,
      }}
    >
      {category.name}
      {tags.length > 0 && ` / ${tags.join(" / ")}`}
    </span>
  );
}
