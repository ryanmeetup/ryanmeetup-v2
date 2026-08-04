import { describe, expect, it } from "vitest";
import { applyAccessPreview, withAccessPreview } from "@/lib/access-preview";
import type { WorkspaceData } from "@/lib/types";

const baseData = {
  projects: [{ id: "visible" }, { id: "hidden" }],
  tasks: [
    { id: "visible-task", project_id: "visible" },
    { id: "hidden-task", project_id: "hidden" },
    { id: "shared-task", project_id: null },
  ],
  subtasks: [
    { task_id: "visible-task" },
    { task_id: "hidden-task" },
  ],
  comments: [{ task_id: "hidden-task" }],
  activity: [{ task_id: "visible-task" }],
  attachments: [{ task_id: "hidden-task" }],
  taskAssignees: [{ task_id: "visible-task" }],
  taskLabels: [{ task_id: "hidden-task" }],
  taskCategories: [{ task_id: "visible-task" }],
  projectOwners: [
    { project_id: "visible" },
    { project_id: "hidden" },
  ],
} as unknown as WorkspaceData;

describe("access preview", () => {
  it("filters every task relation to the preview's visible projects", () => {
    const result = applyAccessPreview(
      baseData,
      { kind: "group", subjectId: "group-1", subjectName: "Reviewers" },
      ["visible"],
    );

    expect(result.projects.map(({ id }) => id)).toEqual(["visible"]);
    expect(result.tasks.map(({ id }) => id)).toEqual(["visible-task", "shared-task"]);
    expect(result.subtasks).toHaveLength(1);
    expect(result.comments).toHaveLength(0);
    expect(result.attachments).toHaveLength(0);
    expect(result.taskLabels).toHaveLength(0);
    expect(result.projectOwners).toHaveLength(1);
  });

  it("replaces an existing preview without dropping unrelated query state", () => {
    expect(
      withAccessPreview("/?viewAsGroup=old&search=launch", {
        kind: "user",
        subjectId: "user 1",
        subjectName: "User One",
      }),
    ).toBe("/?search=launch&viewAsUser=user+1");
  });
});
