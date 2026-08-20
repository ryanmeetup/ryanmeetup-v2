import { describe, expect, it } from "vitest";
import { sortFavoriteProjectsFirst } from "@/lib/project-sort";
import type { Project } from "@/lib/resource-types";

const projects = ["alpha", "beta", "gamma", "delta"].map(
  (id) => ({ id }) as Project,
);

describe("sortFavoriteProjectsFirst", () => {
  it("puts favorites first and preserves the existing order within each group", () => {
    expect(
      sortFavoriteProjectsFirst(projects, ["gamma", "alpha"]).map(
        (project) => project.id,
      ),
    ).toEqual(["alpha", "gamma", "beta", "delta"]);
  });

  it("does not mutate the original project list", () => {
    sortFavoriteProjectsFirst(projects, ["delta"]);

    expect(projects.map((project) => project.id)).toEqual([
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
  });
});
