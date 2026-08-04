import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server/admin-client";
import { apiError, databaseFailure } from "@/lib/server/api-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authorization !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = getAdminClient();
  if (!admin)
    return apiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Storage reconciliation is unavailable.",
    );
  const { data, error } = await admin.rpc(
    "list_orphaned_task_attachment_paths",
  );
  if (error)
    return databaseFailure(request, "attachment-reconciliation.list", error, {
      error: "Storage reconciliation could not be completed.",
    });

  const paths = (data ?? []).map((row: { path: string }) => row.path);
  if (paths.length === 0)
    return NextResponse.json({ inspected: 0, removed: 0 });

  const { error: removeError } = await admin.storage
    .from("task-attachments")
    .remove(paths);
  if (removeError)
    return databaseFailure(
      request,
      "attachment-reconciliation.remove",
      removeError,
      {
        error: "Storage reconciliation could not be completed.",
      },
    );

  return NextResponse.json({ inspected: paths.length, removed: paths.length });
}
