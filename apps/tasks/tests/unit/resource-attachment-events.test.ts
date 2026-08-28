import { describe, expect, it } from "vitest";
import {
  publishResourceAttachmentsChanged,
  resourceAttachmentsAffected,
  subscribeToResourceAttachments,
} from "@/lib/resources/resource-attachment-events";

const view = (resourceId: string, origin: object) =>
  ({ kind: "project", resourceId, origin }) as const;

describe("resource attachment events", () => {
  it("reaches the other views of the same resource", () => {
    const header = view("project-1", {});
    const changes: string[] = [];
    const unsubscribe = subscribeToResourceAttachments((change) => {
      if (resourceAttachmentsAffected(change, header)) changes.push("reload");
    });

    publishResourceAttachmentsChanged({
      kind: "project",
      resourceId: "project-1",
      origin: {},
    });

    expect(changes).toEqual(["reload"]);
    unsubscribe();
  });

  it("skips the view that made the change, and views of other resources", () => {
    const editor = view("project-1", {});
    const other = view("project-2", {});
    const reloaded: string[] = [];
    const unsubscribe = subscribeToResourceAttachments((change) => {
      if (resourceAttachmentsAffected(change, editor)) reloaded.push("editor");
      if (resourceAttachmentsAffected(change, other)) reloaded.push("other");
    });

    publishResourceAttachmentsChanged({
      kind: "project",
      resourceId: "project-1",
      origin: editor.origin,
    });

    expect(reloaded).toEqual([]);
    unsubscribe();
  });

  it("reloads every view of a kind when the change names no resource", () => {
    const project = view("project-1", {});
    const category = {
      kind: "category",
      resourceId: "category-1",
      origin: {},
    } as const;
    const reloaded: string[] = [];
    const unsubscribe = subscribeToResourceAttachments((change) => {
      if (resourceAttachmentsAffected(change, project))
        reloaded.push("project");
      if (resourceAttachmentsAffected(change, category))
        reloaded.push("category");
    });

    publishResourceAttachmentsChanged({ kind: "project", resourceId: null });

    expect(reloaded).toEqual(["project"]);
    unsubscribe();
  });

  it("stops delivering to a view that has unsubscribed", () => {
    const header = view("project-1", {});
    let reloads = 0;
    const unsubscribe = subscribeToResourceAttachments((change) => {
      if (resourceAttachmentsAffected(change, header)) reloads += 1;
    });
    unsubscribe();

    publishResourceAttachmentsChanged({
      kind: "project",
      resourceId: "project-1",
    });

    expect(reloads).toBe(0);
  });
});
