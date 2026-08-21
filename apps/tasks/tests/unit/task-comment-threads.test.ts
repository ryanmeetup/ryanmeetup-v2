import { describe, expect, it } from "vitest";
import { buildTaskCommentThreads } from "@/lib/tasks/task-comment-threads";
import type { TaskComment } from "@/lib/tasks/task-types";

function comment(
  id: string,
  createdAt: string,
  parentId: string | null = null,
): TaskComment {
  return {
    id,
    task_id: "task-1",
    parent_id: parentId,
    body: id,
    created_by: "profile-1",
    created_at: createdAt,
    edited_at: null,
  };
}

describe("task comment threads", () => {
  it("nests replies beneath their direct parent", () => {
    const parent = comment("parent", "2026-08-20T12:00:00Z");
    const reply = comment("reply", "2026-08-20T12:01:00Z", parent.id);
    const nestedReply = comment(
      "nested-reply",
      "2026-08-20T12:02:00Z",
      reply.id,
    );

    expect(buildTaskCommentThreads([nestedReply, parent, reply])).toEqual([
      {
        comment: parent,
        replies: [
          {
            comment: reply,
            replies: [{ comment: nestedReply, replies: [] }],
          },
        ],
      },
    ]);
  });

  it("shows orphaned replies as top-level comments", () => {
    const orphan = comment("orphan", "2026-08-20T12:00:00Z", "deleted-parent");
    expect(buildTaskCommentThreads([orphan])).toEqual([
      { comment: orphan, replies: [] },
    ]);
  });

  it("orders newest threads first and replies oldest first", () => {
    const older = comment("older", "2026-08-20T12:00:00Z");
    const newer = comment("newer", "2026-08-20T13:00:00Z");
    const laterReply = comment("later", "2026-08-20T12:20:00Z", older.id);
    const earlierReply = comment("earlier", "2026-08-20T12:10:00Z", older.id);

    const threads = buildTaskCommentThreads([
      older,
      laterReply,
      newer,
      earlierReply,
    ]);
    expect(threads.map((thread) => thread.comment.id)).toEqual([
      "newer",
      "older",
    ]);
    expect(threads[1].replies.map((thread) => thread.comment.id)).toEqual([
      "earlier",
      "later",
    ]);
  });
});
