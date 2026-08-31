import type { AttachmentResource } from "@/lib/server/resource-attachment-request";
import type { SupabaseClient } from "@supabase/supabase-js";

type DatabaseClient = Pick<SupabaseClient, "from">;

export function attachmentColumns(
  foreignKey: AttachmentResource["foreignKey"],
) {
  return `id,${foreignKey},kind,name,body,url,file_path,mime_type,size_bytes,created_by,created_at,sort_order`;
}

export async function insertAttachment(
  database: DatabaseClient,
  resource: AttachmentResource,
  attachment: Record<string, unknown>,
) {
  return database
    .from(resource.table)
    .insert(attachment)
    .select(attachmentColumns(resource.foreignKey))
    .single();
}

export async function deleteAttachment(
  database: DatabaseClient,
  resource: AttachmentResource,
  id: string,
) {
  return database.from(resource.table).delete().eq("id", id);
}

export async function updateAttachmentOrder(
  database: DatabaseClient,
  resource: AttachmentResource,
  id: string,
  sortOrder: number,
) {
  return database
    .from(resource.table)
    .update({ sort_order: sortOrder })
    .eq("id", id)
    .select(attachmentColumns(resource.foreignKey))
    .single();
}

export async function updateAttachmentNote(
  database: DatabaseClient,
  resource: AttachmentResource,
  id: string,
  values: { name: string; body: string },
) {
  return database
    .from(resource.table)
    .update(values)
    .eq("id", id)
    .eq("kind", "note")
    .select(attachmentColumns(resource.foreignKey))
    .single();
}

/**
 * Tallies attachments per project and per category in two queries rather than
 * one per resource. Row-level security already limits these tables to what the
 * viewer may see, so counting the returned foreign keys matches what the
 * viewer's own attachment fetch will later return.
 *
 * This is a presentation hint - it decides whether a view reserves space for
 * attachments it is about to fetch - so a failure returns undefined rather than
 * failing the page: the caller then treats every resource as possibly having
 * attachments, which is how it behaved before counts existed. A count can also
 * go stale against a later write, which likewise only costs a placeholder.
 */
export async function loadResourceAttachmentCounts(database: DatabaseClient) {
  const [projectResult, categoryResult] = await Promise.all([
    database.from("project_attachments").select("project_id"),
    database.from("category_attachments").select("category_id"),
  ]);
  const failure = projectResult.error ?? categoryResult.error;
  if (failure) {
    console.error("Resource attachment counts unavailable", failure);
    return undefined;
  }
  return {
    projects: tally(projectResult.data, "project_id"),
    categories: tally(categoryResult.data, "category_id"),
  };
}

function tally(rows: unknown[] | null, key: "project_id" | "category_id") {
  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    const id = (row as Record<string, unknown>)[key];
    if (typeof id === "string") counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}
