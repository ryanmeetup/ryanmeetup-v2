import type { Task } from "@/lib/task-types";
import { taskKey } from "@/lib/task-key";

export function TaskKeyBadge({
  task,
  className = "",
  size = "compact",
}: {
  task: Pick<Task, "task_number">;
  className?: string;
  size?: "compact" | "title" | "prominent";
}) {
  const sizeClasses = {
    compact: "rounded-md border px-2 py-1 text-[10px]",
    title: "rounded-md border px-2.5 py-1.5 text-xs",
    prominent:
      "rounded-2xl border-4 px-8 py-5 text-4xl sm:px-10 sm:py-6 sm:text-5xl",
  };

  return (
    <code
      className={`inline-flex shrink-0 border-black/20 bg-transparent font-mono font-bold leading-none tracking-[0.08em] text-black/60 dark:border-white/20 dark:text-white/60 ${sizeClasses[size]} ${className}`}
    >
      {taskKey(task)}
    </code>
  );
}
