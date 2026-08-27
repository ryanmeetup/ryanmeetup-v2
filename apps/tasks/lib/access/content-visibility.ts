import type { AccessGroup } from "@/lib/access/access-types";
import type { Category, Project } from "@/lib/resources/resource-types";

/**
 * The visibility choice the Access page offers per resource. Projects and
 * categories share the vocabulary but not the menu: a project can be limited to
 * its named owners, while a category with no selected groups is by definition
 * workspace-manager-only (docs/access-control-spec.md).
 */
export type VisibilityMode = "owners" | "managers" | "open" | "restricted";

export type VisibilityKind = "project" | "category";

/** The row's collapsed label — what the control reads before it is opened. */
export function visibilitySummary(
  mode: VisibilityMode,
  groupIds: readonly string[],
  groupNames: ReadonlyMap<string, string>,
): string {
  if (mode === "open") return "Everyone";
  if (mode === "owners") return "Project owners only";
  if (mode === "managers") return "Workspace managers only";
  const names = groupIds
    .map((groupId) => groupNames.get(groupId))
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) return "Choose access groups";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export function visibilityOptions(
  kind: VisibilityKind,
): { label: string; value: VisibilityMode }[] {
  return kind === "project"
    ? [
        { label: "Project owners only", value: "owners" },
        { label: "Everyone in the workspace", value: "open" },
        { label: "Selected access groups", value: "restricted" },
      ]
    : [
        { label: "Everyone in the workspace", value: "open" },
        { label: "Workspace managers only", value: "managers" },
        { label: "Selected access groups", value: "restricted" },
      ];
}

/**
 * Categories store only `open` or `restricted`, so the manager-only case is the
 * restricted mode with nothing selected rather than a fourth stored value.
 */
export function categoryVisibilityMode(
  accessMode: Category["access_mode"],
  groupIds: readonly string[],
): VisibilityMode {
  if (accessMode === "open") return "open";
  return groupIds.length > 0 ? "restricted" : "managers";
}

/**
 * Groups with workspace-wide content access already reach every project and
 * category, so selecting them would neither widen nor narrow anything.
 */
export function eligibleVisibilityGroups(
  groups: readonly AccessGroup[],
): AccessGroup[] {
  return groups.filter((group) => !group.grants_global_content);
}

/** A selected-group set only means anything in `restricted`. */
export function selectedGroupIds(
  mode: VisibilityMode,
  groupIds: readonly string[],
): string[] {
  return mode === "restricted" ? [...groupIds] : [];
}

/** A mode with no groups chosen would silently narrow to manager-only. */
export function isVisibilityIncomplete(
  mode: VisibilityMode,
  groupIds: readonly string[],
): boolean {
  return mode === "restricted" && groupIds.length === 0;
}

export function projectVisibilityPayload(
  projectId: Project["id"],
  mode: VisibilityMode,
  groupIds: readonly string[],
) {
  return {
    projectId,
    accessMode: mode,
    groupIds: selectedGroupIds(mode, groupIds),
  };
}

export function categoryVisibilityPayload(
  categoryId: Category["id"],
  mode: VisibilityMode,
  groupIds: readonly string[],
) {
  return {
    categoryId,
    accessMode: mode === "open" ? ("open" as const) : ("restricted" as const),
    groupIds: selectedGroupIds(mode, groupIds),
  };
}
