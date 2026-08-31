import type { Status } from "@/lib/tasks/task-types";

/**
 * A status can demand an explanation before work lands in it — "Will Not Do"
 * does by default. The reason is stored as the task's next comment, so the
 * decision is readable in the conversation rather than lost in the board.
 *
 * Only entering the status asks for one. Editing a task that already sits
 * there, or reordering its card inside the same column, keeps the original.
 */
export function statusNeedingReason(
  statuses: Status[],
  nextStatusId: string,
  previousStatusId: string | null,
): Status | null {
  if (nextStatusId === previousStatusId) return null;
  const next = statuses.find((status) => status.id === nextStatusId);
  return next?.requires_reason ? next : null;
}

export function statusReasonPrompt(status: Status) {
  return `Why is this task moving to ${status.name}?`;
}

export function missingStatusReasonMessage(status: Status) {
  return `Add a reason before moving this task to ${status.name}.`;
}
