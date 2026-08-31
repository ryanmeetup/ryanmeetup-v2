import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import type { Status } from "@/lib/tasks/task-types";

/** Selects the task form's read-only dependencies at a controller boundary. */
export function taskEditorView(
  data: WorkspaceData,
  statuses: Status[] = data.statuses,
) {
  return {
    statuses,
    categories: data.categories,
    projects: data.projects,
    profiles: data.profiles,
    currentProfileId: data.currentProfile.id,
    favoriteProjectIds: data.currentProfile.favorite_project_ids ?? [],
    accessibleCategoryIds: data.accessPreview?.accessibleCategoryIds,
  };
}
