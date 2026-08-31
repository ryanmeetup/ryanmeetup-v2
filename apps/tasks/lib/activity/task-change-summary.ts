import type { Task } from "@/lib/tasks/task-types";

/**
 * The task fields worth naming in activity, in the order they read best.
 * `description` is recorded as a bare flag: bodies are too large to keep a
 * before/after copy of on every save.
 */
export const TASK_CHANGE_FIELDS = [
  "title",
  "status",
  "priority",
  "assignee",
  "project",
  "reported_by",
  "start_date",
  "due_date",
  "due_time",
  "reminder_at",
  "description",
  "categories",
  "tags",
] as const;

export type TaskChangeField = (typeof TASK_CHANGE_FIELDS)[number];

export type TaskChange = {
  field: TaskChangeField;
  /** Raw previous value for scalar fields: an id, a date, or literal text. */
  from?: string | null;
  /** Raw next value for scalar fields. */
  to?: string | null;
  /** Raw added values for set-valued fields (categories, tags). */
  added?: string[];
  /** Raw removed values for set-valued fields. */
  removed?: string[];
};

export type TaskChangeSnapshot = Pick<
  Task,
  | "title"
  | "description"
  | "status_id"
  | "project_id"
  | "assignee_id"
  | "reported_by"
  | "start_date"
  | "due_date"
  | "due_time"
  | "reminder_at"
  | "priority"
> & {
  category_ids: string[];
  category_tags: Record<string, string[]>;
};

const scalarFields: [
  TaskChangeField,
  keyof Omit<TaskChangeSnapshot, "category_ids" | "category_tags">,
][] = [
  ["title", "title"],
  ["status", "status_id"],
  ["priority", "priority"],
  ["assignee", "assignee_id"],
  ["project", "project_id"],
  ["reported_by", "reported_by"],
  ["start_date", "start_date"],
  ["due_date", "due_date"],
  ["due_time", "due_time"],
  ["reminder_at", "reminder_at"],
];

const fieldOrder = new Map(
  TASK_CHANGE_FIELDS.map((field, index) => [field, index]),
);

function setChange(before: string[], after: string[]) {
  const previous = new Set(before);
  const next = new Set(after);
  const added = [...next].filter((value) => !previous.has(value));
  const removed = [...previous].filter((value) => !next.has(value));
  return added.length || removed.length ? { added, removed } : null;
}

function tagValues(tags: Record<string, string[]>) {
  return [...new Set(Object.values(tags ?? {}).flat())];
}

export function taskChangeSnapshot(
  task: TaskChangeSnapshot,
): TaskChangeSnapshot {
  return {
    title: task.title,
    description: task.description,
    status_id: task.status_id,
    project_id: task.project_id,
    assignee_id: task.assignee_id,
    reported_by: task.reported_by,
    start_date: task.start_date,
    due_date: task.due_date,
    due_time: task.due_time,
    reminder_at: task.reminder_at,
    priority: task.priority,
    category_ids: [...task.category_ids].sort(),
    category_tags: task.category_tags ?? {},
  };
}

/** Field-level diff of one task save, ordered for display. */
export function summarizeTaskChanges(
  before: TaskChangeSnapshot,
  after: TaskChangeSnapshot,
): TaskChange[] {
  const changes: TaskChange[] = [];
  for (const [field, key] of scalarFields) {
    const from = before[key] ?? null;
    const to = after[key] ?? null;
    if (from !== to) changes.push({ field, from, to });
  }
  if ((before.description ?? "") !== (after.description ?? ""))
    changes.push({ field: "description" });
  const categories = setChange(before.category_ids, after.category_ids);
  if (categories) changes.push({ field: "categories", ...categories });
  const tags = setChange(
    tagValues(before.category_tags),
    tagValues(after.category_tags),
  );
  if (tags) changes.push({ field: "tags", ...tags });
  return changes.sort(
    (a, b) => fieldOrder.get(a.field)! - fieldOrder.get(b.field)!,
  );
}

/**
 * The diff worth attaching to an "updated the task" row.
 *
 * A save that also changed the status writes a separate "moved task" row,
 * which renders the move as both status pills. Repeating it in the field list
 * would show one change twice.
 */
export function taskUpdateChanges(changes: TaskChange[]) {
  return changes.filter((change) => change.field !== "status");
}

export function parseTaskChanges(value: unknown): TaskChange[] {
  if (!Array.isArray(value)) return [];
  const strings = (input: unknown) =>
    Array.isArray(input)
      ? input.filter((item): item is string => typeof item === "string")
      : undefined;
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { field, from, to, added, removed } = entry as Record<
      string,
      unknown
    >;
    if (!TASK_CHANGE_FIELDS.includes(field as TaskChangeField)) return [];
    return [
      {
        field: field as TaskChangeField,
        from: typeof from === "string" ? from : null,
        to: typeof to === "string" ? to : null,
        added: strings(added),
        removed: strings(removed),
      },
    ];
  });
}
