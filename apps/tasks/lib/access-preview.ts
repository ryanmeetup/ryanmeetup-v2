import type { AccessPreview, WorkspaceData } from "./types";

export const ACCESS_PREVIEW_PARAM = "viewAsGroup";

export function accessPreviewHref(groupId: string) {
  return `/?${ACCESS_PREVIEW_PARAM}=${encodeURIComponent(groupId)}`;
}

export function withAccessPreview(
  href: string,
  preview?: AccessPreview,
) {
  if (!preview) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(ACCESS_PREVIEW_PARAM, preview.groupId);
  return `${path}?${params.toString()}`;
}

export function applyAccessPreview(
  data: WorkspaceData,
  preview: AccessPreview,
  projectIds: string[],
): WorkspaceData {
  const visibleProjectIds = new Set(projectIds);
  const projects = data.projects.filter((project) =>
    visibleProjectIds.has(project.id),
  );
  const tasks = data.tasks.filter(
    (task) => task.project_id && visibleProjectIds.has(task.project_id),
  );
  const visibleTaskIds = new Set(tasks.map((task) => task.id));

  return {
    ...data,
    accessPreview: preview,
    projects,
    tasks,
    subtasks: data.subtasks.filter((item) => visibleTaskIds.has(item.task_id)),
    comments: data.comments.filter((item) => visibleTaskIds.has(item.task_id)),
    activity: data.activity.filter((item) => visibleTaskIds.has(item.task_id)),
    attachments: data.attachments.filter((item) =>
      visibleTaskIds.has(item.task_id),
    ),
    taskAssignees: data.taskAssignees.filter((item) =>
      visibleTaskIds.has(item.task_id),
    ),
    taskLabels: data.taskLabels.filter((item) =>
      visibleTaskIds.has(item.task_id),
    ),
    taskCategories: data.taskCategories.filter((item) =>
      visibleTaskIds.has(item.task_id),
    ),
    projectOwners: data.projectOwners.filter((item) =>
      visibleProjectIds.has(item.project_id),
    ),
  };
}
