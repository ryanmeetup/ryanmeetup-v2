import "server-only";

import { getAdminClient } from "@/lib/server/admin-client";
import { WorkspaceLoadError } from "@/lib/server/workspace-loader";
import { defaultStatuses } from "@/lib/workspace/default-statuses";

/**
 * Repairs an unusable, empty status collection. New databases normally seed
 * these rows before the first workspace request, but older hosted instances
 * may have applied the schema without separately running `seed.sql`.
 */
export async function seedDefaultStatusesIfEmpty() {
  const admin = getAdminClient();
  if (!admin) {
    throw new WorkspaceLoadError("default status bootstrap", {
      message: "The Supabase admin key is not configured.",
    });
  }

  const inserted = await admin.from("statuses").insert(defaultStatuses);
  if (!inserted.error) return;

  // The workspace layout and page can load concurrently. If both observed an
  // empty collection, one insert wins and the other sees a uniqueness error.
  const current = await admin.from("statuses").select("id").limit(1);
  if (!current.error && current.data?.length) return;

  throw new WorkspaceLoadError("default status bootstrap", inserted.error);
}
