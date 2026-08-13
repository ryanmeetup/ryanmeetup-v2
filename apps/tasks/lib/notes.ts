import type { Note } from "./resource-types";
import type { Status, Task } from "./task-types";
import type { StoredTaskDraft } from "./task-drafts";

export const noteColumns =
  "id,title,body,category_id,created_by,converted_task_id,created_at,updated_at,archived_at";

export const noteAutosaveDelayMs = 800;

export function applyNoteDraft(
  note: Note,
  title: string,
  body: string,
  updatedAt = new Date().toISOString(),
): Note {
  return {
    ...note,
    title: title.trim() || null,
    body: body.trim(),
    updated_at: updatedAt,
  };
}

export function noteTitle(note: Pick<Note, "title" | "body">) {
  const explicit = note.title?.trim();
  if (explicit) return explicit;
  const firstLine = note.body
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "Untitled note";
  return firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine;
}

export function noteTaskDescription(note: Pick<Note, "title" | "body">) {
  const title = note.title?.trim();
  if (title) return note.body.trim();
  const lines = note.body.trim().split("\n");
  return lines.length > 1 ? lines.slice(1).join("\n").trim() : note.body.trim();
}

export function filterNotes(notes: Note[], archived: boolean) {
  return notes.filter((note) => Boolean(note.archived_at) === archived);
}

export function paginateNotes(notes: Note[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(notes.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  return {
    notes: notes.slice((safePage - 1) * pageSize, safePage * pageSize),
    page: safePage,
    pageCount,
    totalCount: notes.length,
  };
}

export function noteConversionDraft(
  note: Note,
  statuses: Status[],
  reporterId: string,
  updatedAt = new Date().toISOString(),
): StoredTaskDraft {
  return {
    id: `note-${note.id}`,
    updatedAt,
    draft: {
      title: noteTitle(note),
      description: noteTaskDescription(note),
      status_id:
        statuses.find((status) => status.name.toLowerCase() === "backlog")
          ?.id ??
        statuses.find((status) => status.is_default)?.id ??
        statuses[0]?.id ??
        "",
      project_id: null,
      assignee_id: null,
      reported_by: reporterId,
      start_date: null,
      due_date: null,
      due_time: null,
      reminder_at: null,
      priority: "medium",
      category_ids: note.category_id ? [note.category_id] : [],
      category_tags: {},
    },
  };
}

export function linkNoteToTask(
  note: Note,
  task: Pick<Task, "id">,
  updatedAt = new Date().toISOString(),
): Note {
  return { ...note, converted_task_id: task.id, updated_at: updatedAt };
}
