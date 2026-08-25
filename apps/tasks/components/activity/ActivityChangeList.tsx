import type { IconType } from "react-icons";
import {
  FiAlignLeft,
  FiBell,
  FiCalendar,
  FiClock,
  FiColumns,
  FiFlag,
  FiFolder,
  FiHash,
  FiTag,
  FiType,
  FiUser,
  FiUserCheck,
} from "react-icons/fi";
import { taskChangeSentence } from "@/lib/activity/task-change-presentation";
import type { TaskChangeDetail } from "@/lib/activity/task-change-presentation";
import type { TaskChangeField } from "@/lib/activity/task-change-summary";
import type { Status } from "@/lib/tasks/task-types";

export function StatusLabel({
  status,
}: {
  status: Pick<Status, "name" | "color">;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      {status.name}
    </span>
  );
}

// Reuses the icon each concept already carries elsewhere in the app: projects
// are folders, categories are tags, statuses are board columns.
const fieldIcons: Record<TaskChangeField, IconType> = {
  title: FiType,
  status: FiColumns,
  priority: FiFlag,
  assignee: FiUserCheck,
  project: FiFolder,
  reported_by: FiUser,
  start_date: FiCalendar,
  due_date: FiCalendar,
  due_time: FiClock,
  reminder_at: FiBell,
  description: FiAlignLeft,
  categories: FiTag,
  tags: FiHash,
};

/** The fields a task save changed, one sentence each. */
export function ActivityChangeList({
  changes,
  className = "",
}: {
  changes: TaskChangeDetail[];
  className?: string;
}) {
  if (!changes.length) return null;
  return (
    <ul className={`space-y-1 ${className}`}>
      {changes.map((detail) => {
        const Icon = fieldIcons[detail.field];
        return (
          <li
            key={detail.field}
            className="flex items-start gap-2 text-xs text-black/60 dark:text-white/60"
          >
            <Icon
              aria-hidden
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black/40 dark:text-white/40"
            />
            <span className="min-w-0">{taskChangeSentence(detail)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Single-line form of the same changes, for width-constrained rows. */
export function activityChangeSummary(changes: TaskChangeDetail[]) {
  return changes.map(taskChangeSentence).join(" · ");
}
