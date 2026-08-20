import type { AttachmentResource } from "@/lib/server/resource-attachment-request";
import type { SupabaseClient } from "@supabase/supabase-js";

type DatabaseClient = Pick<SupabaseClient, "from">;

export function attachmentColumns(foreignKey: AttachmentResource["foreignKey"]) {
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

export async function deleteAttachment(database: DatabaseClient, resource: AttachmentResource, id: string) {
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
