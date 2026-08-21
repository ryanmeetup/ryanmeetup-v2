import type { Category } from "@/lib/resources/resource-types";

export function CategoryLabel({
  category,
  className,
}: {
  category: Pick<Category, "name" | "color">;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-2 ${className ?? ""}`}
    >
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
      />
      <span className="truncate">{category.name}</span>
    </span>
  );
}
