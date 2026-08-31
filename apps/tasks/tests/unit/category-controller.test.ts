import type { Dispatch, SetStateAction } from "react";
import { describe, expect, it } from "vitest";
import { categoryController } from "@/components/categories/category-workspace";
import type { Category } from "@/lib/resources/resource-types";
import { demoData } from "@/lib/workspace/demo-data";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

describe("category controller", () => {
  it("keeps category writes inside the category state slice", () => {
    let data = structuredClone(demoData);
    const originalTasks = data.tasks;
    const setData: Dispatch<SetStateAction<WorkspaceData>> = (update) => {
      data = typeof update === "function" ? update(data) : update;
    };
    const commands = categoryController(data, setData, true).commands;
    const category: Category = {
      id: "category-test",
      name: "Test category",
      description: "A focused category controller test.",
      color: "#123456",
      links: [],
      tags: [],
      created_by: data.currentProfile.id,
      archived_at: null,
      access_mode: "open",
    };

    commands.add(category, ["alex"]);
    expect(data.categories).toContainEqual(category);
    expect(data.categoryOwners).toContainEqual({
      category_id: category.id,
      profile_id: "alex",
    });
    expect(data.tasks).toBe(originalTasks);

    commands.update({ ...category, name: "Renamed" }, ["taylor"]);
    expect(data.categories.find((item) => item.id === category.id)?.name).toBe(
      "Renamed",
    );
    expect(
      data.categoryOwners.filter((owner) => owner.category_id === category.id),
    ).toEqual([{ category_id: category.id, profile_id: "taylor" }]);

    const archivedAt = "2026-08-30T12:00:00.000Z";
    commands.setArchived(category.id, archivedAt);
    expect(
      data.categories.find((item) => item.id === category.id)?.archived_at,
    ).toBe(archivedAt);

    commands.remove(category.id);
    expect(data.categories.some((item) => item.id === category.id)).toBe(false);
    expect(
      data.categoryOwners.some((owner) => owner.category_id === category.id),
    ).toBe(false);
  });
});
