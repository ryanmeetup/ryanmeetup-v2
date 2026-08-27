import { FiCalendar } from "react-icons/fi";
import { isTaskLate } from "@/lib/tasks/task-scheduling";
import { formatCalendarDay } from "@/lib/date-format";

export function TaskDueDate({
  dueDate,
  isCompleted,
  showIcon = false,
  size = "compact",
}: {
  dueDate: string | null;
  isCompleted: boolean;
  showIcon?: boolean;
  size?: "compact" | "list";
}) {
  if (!dueDate) return <span>—</span>;

  const isLate = isTaskLate(dueDate, isCompleted);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${
        size === "list" ? "text-sm" : "text-[11px]"
      } ${
        isLate
          ? "font-semibold text-red-700 dark:text-red-300"
          : size === "list"
            ? "text-black/80 dark:text-white/80"
            : "text-black/55 dark:text-white/55"
      }`}
    >
      {showIcon && <FiCalendar className="shrink-0" aria-hidden="true" />}
      <time dateTime={dueDate}>{formatCalendarDay(dueDate)}</time>
      {isLate && (
        <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Late
        </span>
      )}
    </span>
  );
}
