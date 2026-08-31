import type { TaskDraft } from "@/lib/tasks/task-mutations";
import type { Status } from "@/lib/tasks/task-types";
import {
  missingStatusReasonMessage,
  statusNeedingReason,
} from "@/lib/tasks/task-status-reason";

/**
 * The rules every task editor enforces before it saves, in the order a person
 * reads the form. The board, the task page, and the new-task modal all submit
 * the same draft, so they ask the same question here rather than each keeping
 * their own copy of the list.
 */
export function taskDraftValidationMessage(
  draft: TaskDraft,
  context: { statuses: Status[]; currentStatusId: string | null },
): string | null {
  if (!draft.title.trim()) return "A task title is required.";
  if (!draft.status_id) return "A status is required.";
  if (!draft.priority) return "A priority is required.";
  if (draft.category_ids.length === 0) return "Select at least one category.";
  const reasonStatus = statusNeedingReason(
    context.statuses,
    draft.status_id,
    context.currentStatusId,
  );
  return reasonStatus && !draft.status_reason.trim()
    ? missingStatusReasonMessage(reasonStatus)
    : null;
}
