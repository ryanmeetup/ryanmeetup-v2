import type { Priority, Profile } from "@/lib/types";
import { profileDisplayName } from "@/lib/presentation";

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
