import { describe, expect, it } from "vitest";
import {
  findProjectByRouteId,
  projectPath,
  projectRouteId,
  projectSlug,
} from "@/lib/resources/project-route";
import type { Project } from "@/lib/resources/resource-types";

const project = (id: string, name: string) => ({ id, name }) as Project;

describe("project routes", () => {
  it("builds readable, normalized project paths", () => {
    const item = project("project-1", "Café Launch 2027");
    expect(projectSlug(item.name)).toBe("cafe-launch-2027");
    expect(projectPath(item, [item])).toBe("/projects/cafe-launch-2027");
  });

  it("falls back to ids for ambiguous or unsluggable names", () => {
    const first = project("project-1", "Launch!");
    const second = project("project-2", "Launch");
    expect(projectRouteId(first, [first, second])).toBe(first.id);
    expect(projectRouteId(project("project-3", "東京"), [])).toBe("project-3");
  });

  it("resolves unique slugs and compatibility ids without guessing", () => {
    const first = project("project-1", "Launch!");
    const second = project("project-2", "Launch");
    const unique = project("project-3", "Website Refresh");
    const projects = [first, second, unique];
    expect(findProjectByRouteId(projects, "website-refresh")).toBe(unique);
    expect(findProjectByRouteId(projects, "project-2")).toBe(second);
    expect(findProjectByRouteId(projects, "launch")).toBeUndefined();
  });
});
