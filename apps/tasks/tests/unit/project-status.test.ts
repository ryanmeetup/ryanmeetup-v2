import { describe, expect, it } from "vitest";
import {
  groupProjectsByStatus,
  projectStatusDetails,
  projectStatusOptions,
  shouldOfferProjectArchive,
} from "@/lib/resources/project-status";
import type { ProjectStatus } from "@/lib/resources/resource-types";

describe("project status transitions", () => {
  it("offers to archive an active project when it becomes complete", () => {
    expect(shouldOfferProjectArchive("active", "complete", null)).toBe(true);
  });

  it("does not offer again when a complete project is edited", () => {
    expect(shouldOfferProjectArchive("complete", "complete", null)).toBe(false);
  });

  it("does not offer to archive a project that is already archived", () => {
    expect(
      shouldOfferProjectArchive(
        "active",
        "complete",
        "2026-08-27T12:00:00.000Z",
      ),
    ).toBe(false);
  });
});

describe("project status accents", () => {
  it("gives every lifecycle state the same color the dropdown shows", () => {
    for (const option of projectStatusOptions) {
      expect(projectStatusDetails(option.value).color).toBe(option.color);
    }
  });

  it("gives the resting state a color too, so no project renders unmarked", () => {
    expect(projectStatusDetails("discovery").color).toBe("#7c3aed");
  });
});

describe("project status grouping", () => {
  const project = (name: string, status: ProjectStatus) => ({ name, status });

  it("leads with the work that wants attention, not the way projects arrive", () => {
    const groups = groupProjectsByStatus([
      project("Ship", "complete"),
      project("Scope", "discovery"),
      project("Build", "active"),
    ]);
    expect(groups.map((group) => group.value)).toEqual([
      "active",
      "discovery",
      "complete",
    ]);
  });

  it("sections every status, in the order the page reads", () => {
    const groups = groupProjectsByStatus(
      projectStatusOptions.map((option) => project(option.label, option.value)),
    );
    expect(groups.map((group) => group.value)).toEqual([
      "active",
      "queued",
      "discovery",
      "paused",
      "complete",
    ]);
  });

  it("leaves out statuses nothing is in, so the page has no empty headings", () => {
    const groups = groupProjectsByStatus([project("Build", "active")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].projects.map((item) => item.name)).toEqual(["Build"]);
  });

  it("keeps every project in exactly one group", () => {
    const projects = projectStatusOptions.map((option) =>
      project(option.label, option.value),
    );
    const groups = groupProjectsByStatus(projects);
    expect(groups.flatMap((group) => group.projects)).toHaveLength(
      projects.length,
    );
  });
});
