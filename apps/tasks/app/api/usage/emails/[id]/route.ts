import { NextResponse } from "next/server";
import { scheduledEmailActionSchema } from "@/lib/api-schema";
import { authorize } from "@/lib/server/auth";
import { apiError } from "@/lib/server/api-response";
import {
  auditPrivilegedAction,
  privilegedContext,
  readJson,
} from "@/lib/server/privileged-api";
import {
  cancelResendEmail,
  delayResendEmail,
  getResendEmail,
} from "@/lib/server/resend-usage";

const EMAIL_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DELAY_MINUTES = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorize({ owner: true, onboarded: true });
  if ("response" in authorization) return authorization.response;

  const { id } = await params;
  if (!EMAIL_ID_PATTERN.test(id)) {
    return apiError(400, "INVALID_REQUEST", "That email could not be found.");
  }

  try {
    const email = await getResendEmail(id);
    if (!email) {
      return apiError(
        404,
        "NOT_FOUND",
        "That email content is no longer available.",
      );
    }
    return NextResponse.json({ email });
  } catch {
    return apiError(
      502,
      "SERVICE_UNAVAILABLE",
      "The email content could not be loaded. Try again.",
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await readJson(request, scheduledEmailActionSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { id } = await params;
  if (!EMAIL_ID_PATTERN.test(id)) {
    return apiError(400, "INVALID_REQUEST", "That email could not be found.");
  }

  let email;
  try {
    email = await getResendEmail(id);
  } catch {
    return apiError(
      502,
      "SERVICE_UNAVAILABLE",
      "The email could not be loaded. Refresh and try again.",
    );
  }
  if (!email) {
    return apiError(404, "NOT_FOUND", "That email is no longer available.");
  }
  if (email.lastEvent !== "scheduled" || !email.scheduledAt) {
    return apiError(
      409,
      "CONFLICT",
      "Only scheduled emails can be delayed or canceled.",
    );
  }

  const delayedUntil =
    parsed.data.action === "delay"
      ? new Date(
          Math.max(Date.now(), new Date(email.scheduledAt).getTime()) +
            DELAY_MINUTES * 60 * 1000,
        ).toISOString()
      : null;
  let updated = false;
  try {
    updated = delayedUntil
      ? await delayResendEmail(id, delayedUntil)
      : await cancelResendEmail(id);
  } catch {
    // The shared error below keeps Resend response details server-side.
  }
  if (!updated) {
    return apiError(
      502,
      "SERVICE_UNAVAILABLE",
      `The email could not be ${delayedUntil ? "delayed" : "canceled"}. Refresh and try again.`,
    );
  }

  const action = delayedUntil ? "email.delay" : "email.cancel";
  if (
    !(await auditPrivilegedAction(context.admin, context.user, {
      action,
      targetType: "email",
      targetId: id,
      metadata: delayedUntil ? { scheduledAt: delayedUntil } : undefined,
    }))
  ) {
    return apiError(
      500,
      "AUDIT_FAILED",
      `The email was ${delayedUntil ? "delayed" : "canceled"}, but its audit record could not be saved.`,
    );
  }

  return NextResponse.json({
    email: {
      ...email,
      lastEvent: delayedUntil ? "scheduled" : "canceled",
      scheduledAt: delayedUntil ?? email.scheduledAt,
    },
  });
}
