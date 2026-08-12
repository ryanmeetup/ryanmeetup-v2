import type { Category } from "@/lib/types";
import { InclusionFilterMenu } from "./InclusionFilterMenu";

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
  return (
    <InclusionFilterMenu
      label="Category"
      anyLabel="Any category"
      options={categories.map((category) => ({
        label: `${category.name}${category.archived_at ? " (archived)" : ""}`,
        value: category.id,
        markerColor: category.color,
      }))}
      includedValues={includedIds}
      excludedValues={excludedIds}
      onIncludedChange={onIncludedChange}
      onExcludedChange={onExcludedChange}
    />
  );
}
