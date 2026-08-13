import type { Status, TaskActivity } from "@/lib/types";

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
  if (action === "created the task") return "Task created";
  if (action === "updated the task") return "Task updated";
  if (action.startsWith("added checklist item"))
    return action.replace("added checklist item", "Checklist item added");
  if (action.startsWith("attached "))
    return action.replace("attached ", "Attachment added: ");
  return action.charAt(0).toUpperCase() + action.slice(1);
}
