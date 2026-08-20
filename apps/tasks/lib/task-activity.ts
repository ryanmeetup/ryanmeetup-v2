import type { Status } from "@/lib/task-types";
import type { TaskActivity } from "@/lib/activity-types";

export function taskStatusChange(item: TaskActivity, statuses: Status[]) {
  const fromId =
    typeof item.details.from_status_id === "string"
      ? item.details.from_status_id
      : null;
  const toId =
    typeof item.details.status_id === "string" ? item.details.status_id : null;
  return {
    from: statuses.find((status) => status.id === fromId),
    to: statuses.find((status) => status.id === toId),
  };
}

export function taskActivityLabel(action: string) {
  const workspaceLabels: Record<string, string> = {
    "note.create": "Note created",
    "note.update": "Note updated",
    "note.archive": "Note archived",
    "note.restore": "Note restored",
    "note.delete": "Note deleted",
    "note.convert": "Note converted to a task",
    "note.comment": "Comment added to note",
    "organization.create": "Contact created",
    "organization.update": "Contact updated",
    "organization.delete": "Contact deleted",
    "project.create": "Project created",
    "project.update": "Project updated",
    "project.archive": "Project archived",
    "project.restore": "Project restored",
    "project.delete": "Project deleted",
    "project.attachment.add": "Project attachment added",
    "project.attachment.delete": "Project attachment removed",
    "category.create": "Category created",
    "category.update": "Category updated",
    "category.archive": "Category archived",
    "category.restore": "Category restored",
    "category.delete": "Category deleted",
    "category.attachment.add": "Category attachment added",
    "category.attachment.delete": "Category attachment removed",
  };
  if (workspaceLabels[action]) return workspaceLabels[action];
  if (action === "created the task") return "Task created";
  if (action === "updated the task") return "Task updated";
  if (action.startsWith("added checklist item"))
    return action.replace("added checklist item", "Checklist item added");
  if (action.startsWith("attached "))
    return action.replace("attached ", "Attachment added: ");
  if (action.startsWith("removed attachment "))
    return action.replace("removed attachment ", "Attachment removed: ");
  return action.charAt(0).toUpperCase() + action.slice(1);
}
