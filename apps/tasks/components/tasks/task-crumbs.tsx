import { FiGrid } from "react-icons/fi";
import type { EditorCrumb } from "@/components/global";
import { taskKey, taskPath } from "@/lib/tasks/task-key";
import type { Task } from "@/lib/tasks/task-types";

/**
 * The trail the task editor routes sit in.
 *
 * The board is the canonical home of every task, so it heads the trail even
 * when the author arrived from the calendar or a project. Where cancelling
 * returns to is a different question, answered by `?from=`.
 */
export const BOARD_CRUMB: EditorCrumb = {
  href: "/board",
  title: "Board",
  icon: <FiGrid aria-hidden className="shrink-0" />,
};

/** The task's own read view, which the edit route sits under. */
export const taskCrumb = (task: Task): EditorCrumb => ({
  href: taskPath(task),
  title: taskKey(task),
});
