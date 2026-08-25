import { NextResponse } from "next/server";
import { runTaskDigest } from "@/lib/server/task-digest-run";

export const runtime = "nodejs";

/**
 * The digest worker. Vercel invokes this every hour; `digest_settings` decides
 * which of those hours is a send slot, so the cadence is owned by
 * `/admin/usage` rather than by `vercel.json`. Off-schedule hours are cheap:
 * they read one settings row and return.
 */
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const result = await runTaskDigest({ source: "cron" });
  return NextResponse.json(result);
}
