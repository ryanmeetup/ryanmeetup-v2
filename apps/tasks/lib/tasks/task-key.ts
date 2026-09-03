import { instanceBuild } from "@/lib/instance";

export const TASK_KEY_PREFIX = instanceBuild.taskKeyPrefix;

export function taskKey(task: { task_number: number }) {
  return `${TASK_KEY_PREFIX}-${task.task_number}`;
}

export function parseTaskKey(value: string) {
  const match = new RegExp(`^${TASK_KEY_PREFIX}-(\\d+)$`, "i").exec(
    value.trim(),
  );
  if (!match) return null;

  const taskNumber = Number(match[1]);
  return Number.isSafeInteger(taskNumber) && taskNumber > 0 ? taskNumber : null;
}

export function taskPath(task: { task_number: number }) {
  return `/task/${taskKey(task)}`;
}

/** The dedicated mobile edit route. See `docs/MOBILE_EDITOR_SURFACES.md`. */
export function taskEditPath(task: { task_number: number }) {
  return `${taskPath(task)}/edit`;
}
