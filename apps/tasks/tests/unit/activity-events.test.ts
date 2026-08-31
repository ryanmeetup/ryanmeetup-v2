import { describe, expect, it } from "vitest";
import {
  ACTIVITY_EVENT_OPTIONS,
  activityEventKind,
} from "@/lib/activity/activity-events";

describe("activity event kinds", () => {
  it("gives comments a kind of their own on both surfaces", () => {
    expect(activityEventKind("added a comment")).toBe("comment");
    expect(activityEventKind("edited a comment")).toBe("comment");
    expect(activityEventKind("deleted a comment")).toBe("comment");
    expect(activityEventKind("note.comment")).toBe("comment");
    expect(activityEventKind("note.comment.delete")).toBe("comment");
  });

  it("reaches both attachment surfaces with one kind", () => {
    expect(activityEventKind('attached "brief.pdf"')).toBe("attachment");
    expect(activityEventKind("project.attachment.update")).toBe("attachment");
    expect(activityEventKind("category.attachment.delete")).toBe("attachment");
  });

  it("separates access changes from the resource they apply to", () => {
    expect(activityEventKind("project.access.update")).toBe("access");
    expect(activityEventKind("category.access.update")).toBe("access");
    expect(activityEventKind("access_group.membership")).toBe("access");
    expect(activityEventKind("project.update")).toBe("project");
    expect(activityEventKind("category.update")).toBe("category");
  });

  it("classifies the workspace-wide surfaces", () => {
    expect(activityEventKind("calendar.create")).toBe("calendar");
    expect(activityEventKind("category.create")).toBe("category");
    expect(activityEventKind("status.delete")).toBe("status");
    expect(activityEventKind("team.invite")).toBe("team");
    expect(activityEventKind("settings.instance.update")).toBe("settings");
    expect(activityEventKind("digest.run")).toBe("settings");
    expect(activityEventKind("integration.google-calendar.connect")).toBe(
      "settings",
    );
  });

  it("keeps task actions matched on their exact text", () => {
    expect(activityEventKind("created the task")).toBe("created");
    expect(activityEventKind("updated the task")).toBe("updated");
    expect(activityEventKind("moved task")).toBe("moved");
    expect(activityEventKind("task.delete")).toBe("deleted");
    expect(activityEventKind("added 8 checklist items")).toBe("checklist");
  });

  it("offers a chip for every kind it can produce", () => {
    const offered = new Set(
      ACTIVITY_EVENT_OPTIONS.map((option) => option.value),
    );
    const produced = [
      "created the task",
      "updated the task",
      "moved task",
      "task.delete",
      "added a comment",
      "added 8 checklist items",
      'attached "brief.pdf"',
      "note.create",
      "organization.person.add",
      "contact_category.create",
      "project.update",
      "category.update",
      "calendar.delete",
      "status.reorder",
      "team.remove",
      "project.access.update",
      "digest.settings.update",
      "something nobody mapped",
    ].map(activityEventKind);

    for (const kind of produced) expect(offered.has(kind)).toBe(true);
  });
});
