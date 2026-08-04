import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authorization !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey)
    return NextResponse.json(
      { error: "Storage reconciliation is unavailable." },
      { status: 503 },
    );

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc(
    "list_orphaned_task_attachment_paths",
  );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const paths = (data ?? []).map((row: { path: string }) => row.path);
  if (paths.length === 0)
    return NextResponse.json({ inspected: 0, removed: 0 });

  const { error: removeError } = await admin.storage
    .from("task-attachments")
    .remove(paths);
  if (removeError)
    return NextResponse.json(
      { error: removeError.message, inspected: paths.length, removed: 0 },
      { status: 500 },
    );

  return NextResponse.json({ inspected: paths.length, removed: paths.length });
}
