import { describe, expect, it } from "vitest";
import {
  applyNoteDraft,
  filterNotes,
  linkNoteToTask,
  noteConversionDraft,
  noteTaskDescription,
  noteTitle,
  paginateNotes,
} from "@/lib/notes";
import type { Note } from "@/lib/resource-types";

describe("workspace notes", () => {
  it("uses an explicit title when converting a note", () => {
    const note = { title: "Launch thought", body: "Keep all of this context." };
    expect(noteTitle(note)).toBe("Launch thought");
    expect(noteTaskDescription(note)).toBe("Keep all of this context.");
  });

  it("derives the task title from a titleless note's first non-empty line", () => {
    const note = {
      title: null,
      body: "\n  Try a community office hour  \nAsk the meetup regulars.",
    };
    expect(noteTitle(note)).toBe("Try a community office hour");
    expect(noteTaskDescription(note)).toBe("Ask the meetup regulars.");
  });

  it("keeps generated task titles compact", () => {
    const note = { title: null, body: "a".repeat(100) };
    expect(noteTitle(note)).toHaveLength(80);
    expect(noteTitle(note)).toMatch(/…$/);
  });

  it("builds a conversion draft with backlog and the note category", () => {
    const note = {
      id: "note",
      title: null,
      body: "Ship it\nDetails",
      category_id: "category",
    } as never;
    const draft = noteConversionDraft(
      note,
      [
        { id: "default", name: "To do", is_default: true },
        { id: "backlog", name: "Backlog", is_default: false },
      ] as never[],
      "reporter",
      "2026-08-13T00:00:00Z",
    );
    expect(draft).toMatchObject({
      id: "note-note",
      draft: {
        title: "Ship it",
        description: "Details",
        status_id: "backlog",
        category_ids: ["category"],
      },
    });
  });

  it("links a converted note without mutating the original", () => {
    const note = { id: "note", converted_task_id: null } as never;
    const linked = linkNoteToTask(note, { id: "task" }, "2026-08-13T00:00:00Z");
    expect(linked).not.toBe(note);
    expect(linked).toMatchObject({
      converted_task_id: "task",
      updated_at: "2026-08-13T00:00:00Z",
    });
  });

  it("normalizes autosave drafts", () => {
    const note = { title: null, body: "Old", updated_at: "old" } as never;
    expect(applyNoteDraft(note, "  Title ", " Body ", "new")).toMatchObject({
      title: "Title",
      body: "Body",
      updated_at: "new",
    });
  });

  it("filters and paginates the collection independently", () => {
    const active = {
      id: "1",
      title: null,
      body: "Idea",
      category_id: null,
      created_by: "user",
      converted_task_id: null,
      created_at: "now",
      updated_at: "now",
      archived_at: null,
    } satisfies Note;
    const archived: Note = { ...active, id: "2", archived_at: "now" };
    expect(filterNotes([active, archived], false)).toEqual([active]);
    expect(
      paginateNotes(
        [active, { ...active, id: "3" }, { ...active, id: "4" }],
        2,
        2,
      ),
    ).toMatchObject({ page: 2, totalCount: 3, notes: [{ id: "4" }] });
  });
});
