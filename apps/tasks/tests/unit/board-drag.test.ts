import { describe, expect, it } from "vitest";
import { boardDragScrollSpeed } from "@/lib/tasks/board-drag";
import { emptyBoardDragState, leaveBoardColumn } from "@/lib/tasks/board-drag";

describe("board drag scrolling", () => {
  it("scrolls toward nearby viewport edges", () => {
    expect(boardDragScrollSpeed(0, 0, 1000)).toBeLessThan(0);
    expect(boardDragScrollSpeed(1000, 0, 1000)).toBeGreaterThan(0);
  });

  it("does not scroll away from the edges", () => {
    expect(boardDragScrollSpeed(500, 0, 1000)).toBe(0);
  });

  it("clears only the column that is actually being left", () => {
    const state = {
      ...emptyBoardDragState,
      draggedTaskId: "task",
      dragOverStatusId: "doing",
    };
    expect(leaveBoardColumn(state, "todo")).toBe(state);
    expect(leaveBoardColumn(state, "doing")).toEqual({
      ...state,
      dragOverStatusId: null,
    });
    expect(emptyBoardDragState).toEqual({
      draggedTaskId: null,
      dragOverStatusId: null,
      dropTarget: null,
    });
  });
});
