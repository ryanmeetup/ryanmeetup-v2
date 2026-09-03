import type { Category } from "@/lib/resources/resource-types";

export function TaskCategoryBadge({
  category,
  tags = [],
}: {
  category: Category;
  tags?: string[];
}) {
  const tagSummary = tags.length > 0 ? tags.join(", ") : null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/70 dark:text-white/75"
      aria-label={`${category.name} category${tagSummary ? `; tags: ${tagSummary}` : ""}`}
      title={tagSummary ? `${category.name}: ${tagSummary}` : undefined}
      style={{
        borderColor: `${category.color}66`,
        backgroundColor: `${category.color}22`,
      }}
    >
      <i
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
      />
      <span aria-hidden="true">{category.name}</span>
      {tags.length > 0 && (
        <span aria-hidden="true" className="text-black/45 dark:text-white/50">
          · +{tags.length}
        </span>
      )}
    </span>
  );
}
