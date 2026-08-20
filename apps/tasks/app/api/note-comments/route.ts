import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { noteCommentColumns, noteTitle } from "@/lib/notes";
import type { NoteComment } from "@/lib/resource-types";
import { recordWorkspaceActivity } from "@/lib/privileged-api";
import { databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function commentBody(value: unknown) {
  if (typeof value !== "string") return null;
  const body = value.trim();
  return body && body.length <= 5000 ? body : null;
}

async function getNote(
  request: Request,
  supabase: SupabaseClient,
  noteId: string,
) {
  const result = await supabase
    .from("notes")
    .select("id,title,body")
    .eq("id", noteId)
    .single();
  if (result.error)
    return {
      response: databaseFailure(request, "note_comment.note", result.error, {
        error: "The note could not be found.",
      }),
    };
  return { note: result.data };
}

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) =>
    value && typeof value === "object"
      ? (value as { noteId?: unknown; body?: unknown })
      : null,
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const noteId = parsed.data.noteId;
  const body = commentBody(parsed.data.body);
  if (typeof noteId !== "string" || !uuidPattern.test(noteId) || !body)
    return NextResponse.json(
      { error: "Add a comment of 5,000 characters or fewer." },
      { status: 400 },
    );
  const noteResult = await getNote(request, authorization.supabase, noteId);
  if ("response" in noteResult) return noteResult.response;
  const result = await authorization.supabase
    .from("note_comments")
    .insert({ note_id: noteId, body, created_by: authorization.user.id })
    .select(noteCommentColumns)
    .single();
  if (result.error)
    return databaseFailure(request, "note_comment.create", result.error, {
      error: "The comment could not be added.",
    });
  if (
    !(await recordWorkspaceActivity(authorization.user, {
      action: "note.comment",
      targetType: "note",
      targetId: noteId,
      name: noteTitle(noteResult.note),
      href: "/notes",
    }))
  )
    return NextResponse.json(
      {
        error: "The comment was added, but its activity could not be recorded.",
      },
      { status: 500 },
    );
  return NextResponse.json({ comment: result.data as NoteComment });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, (value) =>
    value && typeof value === "object"
      ? (value as { id?: unknown; body?: unknown })
      : null,
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const id = parsed.data.id;
  const body = commentBody(parsed.data.body);
  if (typeof id !== "string" || !uuidPattern.test(id) || !body)
    return NextResponse.json(
      { error: "Invalid comment update." },
      { status: 400 },
    );
  const result = await authorization.supabase
    .from("note_comments")
    .update({ body, edited_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", authorization.user.id)
    .select(noteCommentColumns)
    .single();
  if (result.error)
    return databaseFailure(request, "note_comment.update", result.error, {
      error: "The comment could not be updated.",
    });
  return NextResponse.json({ comment: result.data as NoteComment });
}

export async function DELETE(request: Request) {
  const parsed = await readJson(request, (value) =>
    value &&
    typeof value === "object" &&
    typeof (value as { id?: unknown }).id === "string"
      ? (value as { id: string })
      : null,
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const result = await authorization.supabase
    .from("note_comments")
    .delete()
    .eq("id", parsed.data.id)
    .eq("created_by", authorization.user.id)
    .select("id")
    .single();
  if (result.error)
    return databaseFailure(request, "note_comment.delete", result.error, {
      error: "The comment could not be deleted.",
    });
  return NextResponse.json({ id: result.data.id });
}
