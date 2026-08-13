import { describe, expect, it } from "vitest";
import { applyAccessPreview, withAccessPreview } from "@/lib/access-preview";
import type { WorkspaceData } from "@/lib/types";

const baseData = {
  currentProfile: { favorite_project_ids: ["hidden"] },
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
  taskCategories: [
    { task_id: "visible-task", category_id: "general" },
    { task_id: "hidden-task", category_id: "restricted" },
  ],
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
    ).toBe("/?search=launch&viewAsUser=User+One");
  });

  it("uses the viewed user's favorites instead of the owner's favorites", () => {
    const result = applyAccessPreview(
      baseData,
      {
        kind: "user",
        subjectId: "user-1",
        subjectName: "User One",
        subjectProfile: {
          id: "user-1",
          full_name: "User One",
          avatar_url: null,
          onboarding_completed: true,
          task_details_open_by_default: false,
          favorite_project_ids: ["visible"],
          app_role: "member",
        },
      },
      ["visible"],
    );

    expect(result.currentProfile.favorite_project_ids).toEqual(["visible"]);
    expect(result.currentProfile.id).toBe("user-1");
  });

  it("does not carry personal favorites into a group preview", () => {
    const result = applyAccessPreview(
      baseData,
      { kind: "group", subjectId: "group-1", subjectName: "Reviewers" },
      ["visible"],
    );

    expect(result.currentProfile.favorite_project_ids).toEqual([]);
  });

  it("removes tasks blocked by category access as well as project access", () => {
    const result = applyAccessPreview(
      baseData,
      {
        kind: "user",
        subjectId: "user-1",
        subjectName: "User One",
        inaccessibleTaskIds: ["visible-task"],
      },
      ["visible"],
    );

    expect(result.tasks.map(({ id }) => id)).toEqual(["shared-task"]);
    expect(result.taskCategories).toHaveLength(0);
  });
});
