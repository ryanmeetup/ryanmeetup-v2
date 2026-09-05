import { NextResponse } from "next/server";
import {
  apiError,
  privilegedContext,
  readJson,
  recordWorkspaceActivity,
} from "@/lib/server/privileged-api";
import { databaseFailure } from "@/lib/server/api-response";
import { accessGroupOperationSchema } from "@/lib/server/access-group-operations";
import { dispatchAccessGroupOperation } from "@/lib/server/access-group-services";

export async function POST(request: Request) {
  const parsed = await readJson(request, accessGroupOperationSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;

  const operation = parsed.data;
  const { result, targetId, error } = await dispatchAccessGroupOperation(
    context,
    operation,
  );
  if (error) {
    if (error.code === "AO001")
      return apiError(
        409,
        "CONFLICT",
        "Promote another app owner before demoting the last owner.",
      );
    return databaseFailure(request, `access.${operation.action}`, error, {
      error: "The access change could not be saved. Refresh and try again.",
      conflictError: "That access setting already exists.",
    });
  }
  // Access tables and profile roles have database audit triggers, so the
  // compliance record commits or rolls back with the change itself.
  // Who is in which group decides what every teammate can see, so the change
  // belongs in the feed and not only in the owner-only audit trail.
  await recordWorkspaceActivity(context.admin, context.user, {
    action:
      operation.action === "group.create" ||
      operation.action === "group.update" ||
      operation.action === "group.delete"
        ? `access_group.${operation.action.slice("group.".length)}`
        : operation.action === "tier.default.set"
          ? "access_group.default_tier"
          : operation.action === "profile.access.replace"
            ? "profile.access.update"
            : "access_group.membership",
    targetType:
      operation.action === "profile.access.replace"
        ? "profile"
        : "access_group",
    targetId,
    metadata: {
      resource_name: "name" in operation ? operation.name : undefined,
    },
  });
  return NextResponse.json(result);
}
