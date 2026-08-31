import { describe, expect, it } from "vitest";
import {
  isChecklistPaste,
  parseChecklistPaste,
} from "@/lib/tasks/checklist-paste";

describe("checklist paste", () => {
  it("reads a markdown task list, keeping which boxes are ticked", () => {
    expect(
      parseChecklistPaste(
        [
          "- [ ] A1 — calendar events",
          "- [x] A2 — delete visibility",
          "- [X] C1 — comments filter chip",
        ].join("\n"),
      ),
    ).toEqual([
      { title: "A1 — calendar events", completed: false },
      { title: "A2 — delete visibility", completed: true },
      { title: "C1 — comments filter chip", completed: true },
    ]);
  });

  it("strips bullets and numbering from plain lists", () => {
    expect(
      parseChecklistPaste("- First\n* Second\n+ Third\n1. Fourth\n2) Fifth"),
    ).toEqual([
      { title: "First", completed: false },
      { title: "Second", completed: false },
      { title: "Third", completed: false },
      { title: "Fourth", completed: false },
      { title: "Fifth", completed: false },
    ]);
  });

  it("keeps unmarked lines as items", () => {
    expect(parseChecklistPaste("Write the audit\nFile the task")).toEqual([
      { title: "Write the audit", completed: false },
      { title: "File the task", completed: false },
    ]);
  });

  it("flattens indented sub-items rather than dropping them", () => {
    expect(parseChecklistPaste("- Parent\n    - [ ] Child")).toEqual([
      { title: "Parent", completed: false },
      { title: "Child", completed: false },
    ]);
  });

  it("ignores blank lines, bare bullets, and horizontal rules", () => {
    expect(parseChecklistPaste("- One\n\n-\n---\n***\n- Two")).toEqual([
      { title: "One", completed: false },
      { title: "Two", completed: false },
    ]);
  });

  it("handles carriage returns from other editors", () => {
    expect(parseChecklistPaste("- One\r\n- Two\r- Three")).toHaveLength(3);
  });

  it("leaves a hyphen that is not a bullet attached to its text", () => {
    expect(parseChecklistPaste("-42 degrees\n- [ ] Real item")).toEqual([
      { title: "-42 degrees", completed: false },
      { title: "Real item", completed: false },
    ]);
  });

  it("takes over the input only for a list of more than one item", () => {
    expect(isChecklistPaste(parseChecklistPaste("- [ ] Just one"))).toBe(false);
    expect(isChecklistPaste(parseChecklistPaste(""))).toBe(false);
    expect(isChecklistPaste(parseChecklistPaste("One\nTwo"))).toBe(true);
  });
});
