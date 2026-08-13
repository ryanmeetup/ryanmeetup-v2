import type { AttachmentResource } from "@/lib/server/resource-attachment-request";
import type { SupabaseClient } from "@supabase/supabase-js";

type DatabaseClient = Pick<SupabaseClient, "from">;

export function attachmentColumns(foreignKey: AttachmentResource["foreignKey"]) {
  return `id,${foreignKey},kind,name,body,url,file_path,mime_type,size_bytes,created_by,created_at`;
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
