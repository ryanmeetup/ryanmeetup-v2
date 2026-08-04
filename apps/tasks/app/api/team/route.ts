import { NextResponse } from "next/server";
import { inviteSchema, userDeleteSchema } from "@/lib/api-schemas";
import { tasksAppUrl } from "@/lib/app-url";
import {
  apiError,
  auditPrivilegedAction,
  consumeInviteLimit,
  privilegedContext,
  readJson,
} from "@/lib/privileged-api";

export async function POST(request: Request) {
  const parsed = await readJson(request, inviteSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;

  const allowed = await consumeInviteLimit(context.admin, context.user.id);
  if (allowed === null)
    return apiError(503, "SERVICE_UNAVAILABLE", "Invitations are temporarily unavailable.");
  if (!allowed)
    return apiError(429, "RATE_LIMITED", "Too many invitations were sent. Try again later.", {
      "Retry-After": "3600",
    });

  const fallbackName = parsed.data.email.split("@")[0];
  const fullName = parsed.data.fullName || fallbackName;
  const { data, error } = await context.admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: fullName },
      redirectTo: tasksAppUrl("/auth/callback", request),
    },
  );
  if (error) {
    console.error("Team invitation failed", { actorId: context.user.id, code: error.code });
    return apiError(400, "OPERATION_FAILED", "The invitation could not be sent.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "team.invite",
    targetType: "profile",
    targetId: data.user.id,
  }))) {
    return apiError(500, "AUDIT_FAILED", "The invitation was sent, but its audit record could not be saved.");
  }
  return NextResponse.json({
    profile: {
      id: data.user.id,
      full_name: fullName,
      avatar_url: null,
      onboarding_completed: false,
      task_details_open_by_default: false,
      app_role: "member",
    },
  });
}

export async function DELETE(request: Request) {
  const parsed = await readJson(request, userDeleteSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  if (parsed.data.userId === context.user.id)
    return apiError(400, "INVALID_REQUEST", "You cannot remove your own account.");

  const { error } = await context.admin.auth.admin.deleteUser(parsed.data.userId);
  if (error) {
    console.error("Team member removal failed", { actorId: context.user.id, code: error.code });
    return apiError(400, "OPERATION_FAILED", "The teammate could not be removed.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "team.remove",
    targetType: "profile",
    targetId: parsed.data.userId,
  }))) {
    return apiError(500, "AUDIT_FAILED", "The teammate was removed, but its audit record could not be saved.");
  }
  return NextResponse.json({ ok: true });
}
