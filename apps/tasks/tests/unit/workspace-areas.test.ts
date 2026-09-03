import { describe, expect, it } from "vitest";
import {
  canViewWorkspaceArea,
  isWorkspaceAreaKey,
  workspaceAreaLabel,
  WORKSPACE_AREA_KEYS,
} from "@/lib/access/workspace-areas";

describe("workspace area registry", () => {
  it("accepts only the keys the registry declares", () => {
    expect(isWorkspaceAreaKey("notes")).toBe(true);
    expect(isWorkspaceAreaKey("board")).toBe(false);
    expect(isWorkspaceAreaKey(null)).toBe(false);
  });

  it("names a page for the audit trail and the toast", () => {
    expect(workspaceAreaLabel("contacts")).toBe("Contacts");
  });

  it("treats a page missing from the list as closed", () => {
    expect(canViewWorkspaceArea(["notes"], "notes")).toBe(true);
    expect(canViewWorkspaceArea(["notes"], "contacts")).toBe(false);
    expect(canViewWorkspaceArea([], "calendar")).toBe(false);
  });

  it("opens every page where there is no server to ask", () => {
    for (const area of WORKSPACE_AREA_KEYS)
      expect(canViewWorkspaceArea(undefined, area)).toBe(true);
  });
});
