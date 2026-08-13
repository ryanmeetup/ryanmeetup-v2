import { NextResponse } from "next/server";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  readJson,
} from "@/lib/privileged-api";
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
    return databaseFailure(request, `access.${operation.action}`, error, {
      error: "The access change could not be saved. Refresh and try again.",
      conflictError: "That access setting already exists.",
    });
  }
  const audited = await auditPrivilegedAction(context.admin, context.user, {
    action: operation.action,
    targetType: "access_group",
    targetId,
  });
  if (!audited)
    return apiError(
      500,
      "AUDIT_FAILED",
      "The access change was saved, but its audit record could not be created.",
    );
  return NextResponse.json(result);
}
