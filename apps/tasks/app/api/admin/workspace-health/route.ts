import { NextResponse } from "next/server";
import { databaseFailure } from "@/lib/server/api-response";
import { privilegedContext } from "@/lib/server/privileged-api";

export async function POST(request: Request) {
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { data, error } = await context.admin.rpc("repair_beginner_flow");
  if (error)
    return databaseFailure(request, "workspace-foundation.repair", error, {
      error: "Workspace provisioning could not be repaired.",
    });
  return NextResponse.json({ health: data });
}
