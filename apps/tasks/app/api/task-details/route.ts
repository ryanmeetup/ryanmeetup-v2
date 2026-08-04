import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Subtask, TaskActivity, TaskComment } from "@/lib/types";

async function clientForUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? supabase : null;
}
const failure = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

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
    !body.id ||
    !body.taskId ||
    typeof body.value !== "string" ||
    !body.value.trim()
  )
    return failure("Invalid task detail.");
  if (body.kind === "subtask") {
    const { data, error } = await supabase.rpc("create_subtask_with_activity", {
      subtask_id: body.id,
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
        id: body.id,
        task_id: body.taskId,
        body: body.value.trim(),
        created_by: (await supabase.auth.getUser()).data.user!.id,
      })
      .select("*")
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
    .select("*")
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
