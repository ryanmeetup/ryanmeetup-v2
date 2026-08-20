import type { Priority } from "@/lib/task-types";
import type { Profile } from "@/lib/workspace-types";
import { profileDisplayName } from "@/lib/presentation";
import type { Category } from "@/lib/resource-types";

export const taskPriorities: Priority[] = ["low", "medium", "high", "urgent"];

export function splitTaskFilterValues(value: string) {
  return value === "all" || !value ? [] : value.split(",").filter(Boolean);
}

export function resolveProfileFilterIds(
  value: string,
  profiles: Profile[],
  allowUnassigned = false,
) {
  return splitTaskFilterValues(value).flatMap((entry) => {
    if (allowUnassigned && entry.toLowerCase() === "unassigned")
      return ["unassigned"];
    const profile = profiles.find(
      (item) => item.id === entry || profileDisplayName(item) === entry,
    );
    return profile ? [profile.id] : [];
  });
}

export function resolveEntityFilterIds<T extends { id: string; name: string }>(
  value: string,
  items: T[],
  allowNone = false,
) {
  return splitTaskFilterValues(value).flatMap((entry) => {
    if (allowNone && entry === "none") return ["none"];
    const item = items.find(
      (candidate) => candidate.id === entry || candidate.name === entry,
    );
    return item ? [item.id] : [];
  });
}

export function resolvePriorityFilterValues(value: string) {
  return splitTaskFilterValues(value)
    .map((entry) => entry.toLowerCase())
    .filter((entry): entry is Priority =>
      taskPriorities.includes(entry as Priority),
    );
}

export function resolveDueFilterValues(value: string) {
  return splitTaskFilterValues(value).filter((entry) =>
    ["7", "14", "30"].includes(entry),
  );
}

export type CategoryTagFilter = { categoryId: string; tag: string };

export function categoryTagFilterValue({ categoryId, tag }: CategoryTagFilter) {
  return `${encodeURIComponent(categoryId)}~${encodeURIComponent(tag)}`;
}

export function parseCategoryTagFilterValue(
  value: string,
): CategoryTagFilter | null {
  const separator = value.indexOf("~");
  if (separator < 1) return null;
  try {
    const categoryId = decodeURIComponent(value.slice(0, separator));
    const tag = decodeURIComponent(value.slice(separator + 1));
    return categoryId && tag ? { categoryId, tag } : null;
  } catch {
    return null;
  }
}

export function resolveCategoryTagFilters(
  value: string,
  categories: Category[],
) {
  return splitTaskFilterValues(value).flatMap((entry) => {
    const encoded = parseCategoryTagFilterValue(entry);
    if (encoded) {
      const category = categories.find(
        (item) => item.id === encoded.categoryId,
      );
      return category?.tags.includes(encoded.tag) ? [encoded] : [];
    }
    const match = categories
      .flatMap((category) => category.tags.map((tag) => ({ category, tag })))
      .find(({ category, tag }) => `${category.name}: ${tag}` === entry);
    return match ? [{ categoryId: match.category.id, tag: match.tag }] : [];
  });
}
