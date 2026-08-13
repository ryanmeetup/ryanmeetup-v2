import type { Note } from "./types";

export const noteColumns =
  "id,title,body,category_id,created_by,converted_task_id,created_at,updated_at,archived_at";

export const noteAutosaveDelayMs = 800;

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
