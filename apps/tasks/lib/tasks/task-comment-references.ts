import { TASK_KEY_PREFIX } from "./task-key";
import type { TaskReference } from "./task-types";

export type TaskCommentSegment =
  | { kind: "text"; value: string }
  | { kind: "task"; task: TaskReference; value: string };

const taskReferencePattern = () =>
  new RegExp(`\\b${TASK_KEY_PREFIX}-(\\d+)\\b`, "gi");

export function taskCommentSegments(
  body: string,
  tasks: TaskReference[],
): TaskCommentSegment[] {
  const tasksByNumber = new Map(tasks.map((task) => [task.task_number, task]));
  const segments: TaskCommentSegment[] = [];
  let textStart = 0;

  for (const match of body.matchAll(taskReferencePattern())) {
    const matchStart = match.index;
    const task = tasksByNumber.get(Number(match[1]));
    if (!task) continue;

    if (matchStart > textStart) {
      segments.push({ kind: "text", value: body.slice(textStart, matchStart) });
    }
    segments.push({ kind: "task", task, value: match[0] });
    textStart = matchStart + match[0].length;
  }

  if (textStart < body.length || segments.length === 0) {
    segments.push({ kind: "text", value: body.slice(textStart) });
  }

  return segments;
}
