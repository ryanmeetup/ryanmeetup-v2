import type { TaskComment } from "./task-types";

export type TaskCommentThread = {
  comment: TaskComment;
  replies: TaskCommentThread[];
};

export function buildTaskCommentThreads(
  comments: TaskComment[],
): TaskCommentThread[] {
  const nodes = new Map<string, TaskCommentThread>(
    comments.map((comment) => [comment.id, { comment, replies: [] }]),
  );
  const roots: TaskCommentThread[] = [];

  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parent_id ? nodes.get(comment.parent_id) : undefined;
    if (parent && parent !== node) parent.replies.push(node);
    else roots.push(node);
  }

  const byOldest = (a: TaskCommentThread, b: TaskCommentThread) =>
    a.comment.created_at.localeCompare(b.comment.created_at);
  for (const node of nodes.values()) node.replies.sort(byOldest);
  roots.sort((a, b) =>
    b.comment.created_at.localeCompare(a.comment.created_at),
  );

  return roots;
}
