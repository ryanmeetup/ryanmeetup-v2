import { describe, expect, it } from "vitest";
import { noteTaskDescription, noteTitle } from "@/lib/notes";

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
});
