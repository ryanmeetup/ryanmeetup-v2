import { NextResponse } from "next/server";
import { noteColumns } from "@/lib/notes";
import { databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) =>
    value && typeof value === "object"
      ? (value as {
          body?: unknown;
          title?: unknown;
          categoryId?: unknown;
        })
      : null,
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const input = parsed.data;
  const body = text(input.body, 10000);
  const title =
    input.title == null || input.title === "" ? null : text(input.title, 200);
  const categoryId =
    input.categoryId == null || input.categoryId === ""
      ? null
      : input.categoryId;
  if (
    !body ||
    (input.title && !title) ||
    (categoryId !== null &&
      (typeof categoryId !== "string" || !uuidPattern.test(categoryId)))
  )
    return NextResponse.json(
      { error: "Add a note of 10,000 characters or fewer." },
      { status: 400 },
    );
  const result = await authorization.supabase
    .from("notes")
    .insert({
      body,
      title,
      category_id: categoryId,
      created_by: authorization.user.id,
    })
    .select(noteColumns)
    .single();
  if (result.error)
    return databaseFailure(request, "note.create", result.error, {
      error: "The note could not be saved.",
    });
  return NextResponse.json({ note: result.data });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, (value) =>
    value && typeof value === "object"
      ? (value as {
          id?: unknown;
          body?: unknown;
          title?: unknown;
          archived?: unknown;
          convertedTaskId?: unknown;
        })
      : null,
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const input = parsed.data;
  if (typeof input.id !== "string")
    return NextResponse.json({ error: "A note is required." }, { status: 400 });
  const values: Record<string, string | null> = {};
  if (input.body !== undefined) {
    const body = text(input.body, 10000);
    if (!body)
      return NextResponse.json(
        { error: "A note cannot be empty." },
        { status: 400 },
      );
    values.body = body;
  }
  if (input.title !== undefined) {
    const title =
      input.title === null || input.title === ""
        ? null
        : text(input.title, 200);
    if (input.title && !title)
      return NextResponse.json(
        { error: "Note titles must be 200 characters or fewer." },
        { status: 400 },
      );
    values.title = title;
  }
  if (typeof input.archived === "boolean")
    values.archived_at = input.archived ? new Date().toISOString() : null;
  if (typeof input.convertedTaskId === "string")
    values.converted_task_id = input.convertedTaskId;
  if (Object.keys(values).length === 0)
    return NextResponse.json(
      { error: "No note changes were provided." },
      { status: 400 },
    );
  const result = await authorization.supabase
    .from("notes")
    .update(values)
    .eq("id", input.id)
    .select(noteColumns)
    .single();
  if (result.error)
    return databaseFailure(request, "note.update", result.error, {
      error: "The note could not be updated.",
    });
  return NextResponse.json({ note: result.data });
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
    .from("notes")
    .delete()
    .eq("id", parsed.data.id);
  if (result.error)
    return databaseFailure(request, "note.delete", result.error, {
      error: "The note could not be deleted.",
    });
  return NextResponse.json({ ok: true });
}
