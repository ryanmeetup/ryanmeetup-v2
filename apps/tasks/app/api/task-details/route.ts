import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Subtask, TaskActivity, TaskComment } from "@/lib/types";
import { TASK_PAGE_SIZE, WORKSPACE_COLUMNS } from "@/lib/workspace-loader";

async function clientForUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? supabase : null;
}
const failure = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function GET(request: Request) {
  const supabase = await clientForUser();
  if (!supabase) return failure("Not authorized", 403);
  const params = new URL(request.url).searchParams;
  const taskId = params.get("taskId");
  const activityPage = Math.max(0, Number.parseInt(params.get("activityPage") ?? "0", 10) || 0);
  if (!taskId) return failure("A task is required.");
  const from = activityPage * TASK_PAGE_SIZE;
  const [subtasks, comments, activity, attachments] = await Promise.all([
    supabase.from("subtasks").select(WORKSPACE_COLUMNS.subtasks).eq("task_id", taskId).order("sort_order"),
    supabase.from("task_comments").select(WORKSPACE_COLUMNS.comments).eq("task_id", taskId).order("created_at", { ascending: false }).limit(TASK_PAGE_SIZE),
    supabase.from("task_activity").select(WORKSPACE_COLUMNS.activity, { count: "exact" }).eq("task_id", taskId).order("created_at", { ascending: false }).range(from, from + TASK_PAGE_SIZE - 1),
    supabase.from("task_attachments").select(WORKSPACE_COLUMNS.attachments).eq("task_id", taskId).order("created_at"),
  ]);
  const failed = [subtasks, comments, activity, attachments].find((result) => result.error);
  if (failed?.error) return failure(failed.error.message);
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
    subtasks: subtasks.data ?? [], comments: comments.data ?? [],
    activity: activity.data ?? [], attachments: signedAttachments,
    activityPage: { page: activityPage, hasMore: from + (activity.data?.length ?? 0) < (activity.count ?? 0) },
  });
}

export async function POST(request: Request) {
  const supabase = await clientForUser();
  if (!supabase) return failure("Not authorized", 403);
  const body = (await request.json()) as {
    kind?: string;
    id?: string;
    taskId?: string;
    value?: string;
    sortOrder?: number;
  };
  if (
    !body.taskId ||
    typeof body.value !== "string" ||
    !body.value.trim()
  )
    return failure("Invalid task detail.");
  if (body.kind === "subtask") {
    const id = crypto.randomUUID();
    const { data, error } = await supabase.rpc("create_subtask_with_activity", {
      subtask_id: id,
      parent_task_id: body.taskId,
      subtask_title: body.value,
      subtask_sort_order: body.sortOrder ?? 0,
    });
    if (error) return failure(error.message);
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
        created_by: (await supabase.auth.getUser()).data.user!.id,
      })
      .select(WORKSPACE_COLUMNS.comments)
      .single();
    if (error) return failure(error.message);
    return NextResponse.json({ comment: data as TaskComment });
  }
  return failure("Invalid task detail type.");
}

export async function PATCH(request: Request) {
  const supabase = await clientForUser();
  if (!supabase) return failure("Not authorized", 403);
  const body = (await request.json()) as { id?: string; completed?: boolean };
  if (!body.id || typeof body.completed !== "boolean")
    return failure("Invalid checklist update.");
  const { data, error } = await supabase
    .from("subtasks")
    .update({ is_completed: body.completed })
    .eq("id", body.id)
    .select(WORKSPACE_COLUMNS.subtasks)
    .single();
  if (error) return failure(error.message);
  return NextResponse.json({ subtask: data as Subtask });
}

export async function DELETE(request: Request) {
  const supabase = await clientForUser();
  if (!supabase) return failure("Not authorized", 403);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return failure("A checklist item is required.");
  const { data, error } = await supabase
    .from("subtasks")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error) return failure(error.message);
  return NextResponse.json({ id: data.id });
}
