import { describe, expect, it } from "vitest";
import { activityFilterCount, buildActivityQuery } from "@/lib/activity-query";
import type { Project } from "@/lib/resource-types";
import type { Profile } from "@/lib/workspace-types";

describe("activity query controller", () => {
  const projects = [{ id: "p1", name: "Meetup" }] as Project[];
  const profiles = [{ id: "u1", full_name: "Ryan Le" }] as Profile[];
  const filters = {
    projects: "Meetup",
    excludeProjects: "",
    people: "Ryan Le",
    excludePeople: "",
    events: "created,moved",
    excludeEvents: "",
    when: "week",
  };
  it("counts every active selection", () =>
    expect(activityFilterCount(filters)).toBe(5));
  it("resolves readable values at the API boundary", () =>
    expect(buildActivityQuery(filters, projects, profiles).toString()).toBe(
      "projects=p1&people=u1&events=created%2Cmoved&when=week",
    ));
});
