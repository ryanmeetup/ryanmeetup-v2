import type { UserAccessMetadata } from "@/lib/access/access-types";
import type { Profile } from "@/lib/workspace/workspace-types";

export type TeamSortField =
  | "name"
  | "assignedOpen"
  | "assignedCompleted"
  | "reported"
  | "assigned"
  | "created";

export type TeamSortDirection = "asc" | "desc";

export function sortAccessTeam(
  profiles: Profile[],
  metadataByProfile: Map<string, UserAccessMetadata>,
  field: TeamSortField,
  direction: TeamSortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...profiles].sort((left, right) => {
    const nameComparison = left.full_name.localeCompare(right.full_name);
    if (field === "name") return nameComparison * multiplier;

    const leftValue = metadataByProfile.get(left.id)?.[field] ?? 0;
    const rightValue = metadataByProfile.get(right.id)?.[field] ?? 0;
    return (leftValue - rightValue) * multiplier || nameComparison;
  });
}
