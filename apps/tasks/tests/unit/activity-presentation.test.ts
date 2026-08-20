import { describe, expect, it } from "vitest";
import {
  describeActivity,
  groupActivityByDate,
  resolveActivityRows,
} from "@/lib/activity-presentation";
import type { TaskActivity } from "@/lib/activity-types";
import type { Status } from "@/lib/task-types";

const activity = (
  id: string,
  created_at: string,
  details: Record<string, unknown> = {},
): TaskActivity =>
  ({
    id,
    task_id: "task",
    actor_id: null,
    action: "moved task",
    details,
    created_at,
  }) as TaskActivity;

describe("activity presentation", () => {
  it("resolves non-task resource labels and links", () => {
    const item = activity("resource", "2026-08-13T12:00:00Z", {
      resource_name: "Acme",
      resource_href: "/contacts",
    });
    item.task_id = null;
    const [row] = resolveActivityRows([item], {
      tasks: [],
      profiles: [],
      projects: [],
      categories: [],
      statuses: [],
    });
    expect(row).toMatchObject({
      resourceName: "Acme",
      resourceHref: "/contacts",
    });
  });

  it("retains the category color for category activity", () => {
    const item = activity("category", "2026-08-13T12:00:00Z", {
      resource_id: "operations",
      resource_name: "Operations",
      resource_href: "/categories",
    });
    item.task_id = null;
    item.action = "category.update";
    const [row] = resolveActivityRows([item], {
      tasks: [],
      profiles: [],
      projects: [],
      categories: [
        { id: "operations", name: "Operations", color: "#f97316" },
      ] as never[],
      statuses: [],
    });
    expect(row?.category).toMatchObject({
      name: "Operations",
      color: "#f97316",
    });
  });

  it("describes moves with resolved statuses and falls back safely", () => {
    const statuses = [
      { id: "todo", name: "To do" },
      { id: "done", name: "Done" },
    ] as Status[];
    expect(
      describeActivity(
        activity("1", "2026-08-13T12:00:00Z", {
          from_status_id: "todo",
          status_id: "done",
        }),
        statuses,
      ),
    ).toMatchObject({
      kind: "status",
      from: { id: "todo" },
      to: { id: "done" },
    });
    expect(
      describeActivity(activity("2", "2026-08-13T12:00:00Z"), statuses),
    ).toEqual({ kind: "text", label: "Task moved" });
  });

  it("groups rows on calendar dates in the requested timezone", () => {
    const rows = [
      { item: activity("1", "2026-08-14T01:00:00Z") },
      { item: activity("2", "2026-08-13T20:00:00Z") },
    ] as never[];
    const groups = groupActivityByDate(rows, "en-US", "America/New_York");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.rows).toHaveLength(2);
  });
});
