import { FiCalendar } from "react-icons/fi";

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTaskLate(
  dueDate: string | null,
  isCompleted: boolean,
  today = new Date(),
) {
  return Boolean(dueDate && !isCompleted && dueDate < localDateValue(today));
}

export function TaskDueDate({
  dueDate,
  isCompleted,
  showIcon = false,
}: {
  dueDate: string | null;
  isCompleted: boolean;
  showIcon?: boolean;
}) {
  if (!dueDate) return <span>—</span>;

  const isLate = isTaskLate(dueDate, isCompleted);

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 text-[11px] ${
        isLate
          ? "font-semibold text-red-700 dark:text-red-300"
          : "text-black/55 dark:text-white/55"
      }`}
    >
      {showIcon && <FiCalendar className="shrink-0" aria-hidden="true" />}
      <time dateTime={dueDate}>{displayDate(dueDate)}</time>
      {isLate && (
        <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Late
        </span>
      )}
    </span>
  );
}
