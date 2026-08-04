import { NextResponse } from "next/server";
import { databaseFailure, operationFailed } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import type { Subtask, TaskActivity, TaskComment } from "@/lib/types";
import { TASK_PAGE_SIZE, WORKSPACE_COLUMNS } from "@/lib/workspace-loader";

const failure = (message: string) => operationFailed(message);

export async function GET(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { supabase } = authorization;
  const params = new URL(request.url).searchParams;
  const taskId = params.get("taskId");
  const activityPage = Math.max(
    0,
    Number.parseInt(params.get("activityPage") ?? "0", 10) || 0,
  );
  if (!taskId) return failure("A task is required.");
  const from = activityPage * TASK_PAGE_SIZE;
  const [subtasks, comments, activity, attachments] = await Promise.all([
    supabase
      .from("subtasks")
      .select(WORKSPACE_COLUMNS.subtasks)
      .eq("task_id", taskId)
      .order("sort_order"),
    supabase
      .from("task_comments")
      .select(WORKSPACE_COLUMNS.comments)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(TASK_PAGE_SIZE),
    supabase
      .from("task_activity")
      .select(WORKSPACE_COLUMNS.activity, { count: "exact" })
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .range(from, from + TASK_PAGE_SIZE - 1),
    supabase
      .from("task_attachments")
      .select(WORKSPACE_COLUMNS.attachments)
      .eq("task_id", taskId)
      .order("created_at"),
  ]);
  const failed = [subtasks, comments, activity, attachments].find(
    (result) => result.error,
  );
  if (failed?.error)
    return databaseFailure(request, "task-details.load", failed.error, {
      error: "Task details could not be loaded. Try again.",
    });
  const attachmentPaths = (attachments.data ?? []).flatMap((attachment) =>
    attachment.file_path ? [attachment.file_path] : [],
  );
  const { data: signedUrls } = attachmentPaths.length
    ? await supabase.storage
        .from("task-attachments")
        .createSignedUrls(attachmentPaths, 3600)
    : { data: [] };
  const urlsByPath = new Map(
    (signedUrls ?? []).flatMap((item) =>
      item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
  const signedAttachments = (attachments.data ?? []).map((attachment) => {
    const signedUrl = attachment.file_path
      ? urlsByPath.get(attachment.file_path)
      : undefined;
    return signedUrl ? { ...attachment, url: signedUrl } : attachment;
  });
  return NextResponse.json({
    subtasks: subtasks.data ?? [],
    comments: comments.data ?? [],
    activity: activity.data ?? [],
    attachments: signedAttachments,
    activityPage: {
      page: activityPage,
      hasMore: from + (activity.data?.length ?? 0) < (activity.count ?? 0),
    },
  });
}

export async function POST(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { supabase, user } = authorization;
  const body = (await request.json()) as {
    kind?: string;
    id?: string;
    taskId?: string;
    value?: string;
    sortOrder?: number;
  };
  if (!body.taskId || typeof body.value !== "string" || !body.value.trim())
    return failure("Invalid task detail.");
  if (body.kind === "subtask") {
    const id = crypto.randomUUID();
    const { data, error } = await supabase.rpc("create_subtask_with_activity", {
      subtask_id: id,
      parent_task_id: body.taskId,
      subtask_title: body.value,
      subtask_sort_order: body.sortOrder ?? 0,
    });
    if (error)
      return databaseFailure(request, "subtask.create", error, {
        error: "The checklist item could not be added. Try again.",
      });
    return NextResponse.json(
      data as { subtask: Subtask; activity: TaskActivity },
    );
  }
  if (body.kind === "comment") {
    const { data, error } = await supabase
      .from("task_comments")
      .insert({
        id: crypto.randomUUID(),
        task_id: body.taskId,
        body: body.value.trim(),
        created_by: user.id,
      })
      .select(WORKSPACE_COLUMNS.comments)
      .single();
    if (error)
      return databaseFailure(request, "comment.create", error, {
        error: "The comment could not be added. Try again.",
      });
    return NextResponse.json({ comment: data as TaskComment });
  }
  return failure("Invalid task detail type.");
}

export async function PATCH(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { supabase } = authorization;
  const body = (await request.json()) as { id?: string; completed?: boolean };
  if (!body.id || typeof body.completed !== "boolean")
    return failure("Invalid checklist update.");
  const { data, error } = await supabase
    .from("subtasks")
    .update({ is_completed: body.completed })
    .eq("id", body.id)
    .select(WORKSPACE_COLUMNS.subtasks)
    .single();
  if (error)
    return databaseFailure(request, "subtask.update", error, {
      error: "The checklist item could not be updated. Try again.",
    });
  return NextResponse.json({ subtask: data as Subtask });
}

export async function DELETE(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { supabase } = authorization;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return failure("A checklist item is required.");
  const { data, error } = await supabase
    .from("subtasks")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error)
    return databaseFailure(request, "subtask.delete", error, {
      error: "The checklist item could not be removed. Try again.",
    });
  return NextResponse.json({ id: data.id });
}
