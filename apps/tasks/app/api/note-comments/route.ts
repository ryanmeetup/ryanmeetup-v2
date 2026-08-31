import { NextResponse } from "next/server";
import {
  isJsonObject,
  isUuid,
  requiredTrimmedText,
} from "@/lib/api-schema/shared";
import { noteCommentColumns } from "@/lib/resources/notes";
import type { NoteComment } from "@/lib/resources/resource-types";
import { databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";

function commentBody(value: unknown) {
  return requiredTrimmedText(value, 5000);
}

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) =>
    isJsonObject(value)
      ? (value as { noteId?: unknown; body?: unknown })
      : null,
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const noteId = parsed.data.noteId;
  const body = commentBody(parsed.data.body);
  if (!isUuid(noteId) || !body)
    return NextResponse.json(
      { error: "Add a comment of 5,000 characters or fewer." },
      { status: 400 },
    );
  const result = await authorization.supabase
    .from("note_comments")
    .insert({ note_id: noteId, body, created_by: authorization.user.id })
    .select(noteCommentColumns)
    .single();
  if (result.error)
    return databaseFailure(request, "note_comment.create", result.error, {
      error: "The comment could not be added.",
    });
  return NextResponse.json({ comment: result.data as NoteComment });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, (value) =>
    isJsonObject(value) ? (value as { id?: unknown; body?: unknown }) : null,
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const id = parsed.data.id;
  const body = commentBody(parsed.data.body);
  if (!isUuid(id) || !body)
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
    isJsonObject(value) && isUuid(value.id) ? (value as { id: string }) : null,
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
