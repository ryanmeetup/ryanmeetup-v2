import { describe, expect, it } from "vitest";
import { demoData } from "@/lib/workspace/demo-data";

describe("demo workspace", () => {
  it("uses neutral first-run content", () => {
    expect(JSON.stringify(demoData)).not.toMatch(/ryan meetup|ryancon/i);
    expect(demoData.currentProfile.full_name).toBe("Taylor Brooks");
    expect(demoData.projects.map((project) => project.name)).toEqual([
      "Website Refresh",
      "Fall Launch",
    ]);
  });

  it("keeps fixture relationships connected", () => {
    const profileIds = new Set(demoData.profiles.map((profile) => profile.id));
    const projectIds = new Set(demoData.projects.map((project) => project.id));
    const categoryIds = new Set(
      demoData.categories.map((category) => category.id),
    );

    expect(profileIds).toContain(demoData.currentProfile.id);
    expect(
      demoData.tasks.every(
        (task) =>
          profileIds.has(task.created_by) &&
          profileIds.has(task.reported_by) &&
          (!task.assignee_id || profileIds.has(task.assignee_id)) &&
          (!task.project_id || projectIds.has(task.project_id)),
      ),
    ).toBe(true);
    expect(
      demoData.taskCategories.every((assignment) =>
        categoryIds.has(assignment.category_id),
      ),
    ).toBe(true);
  });
});
