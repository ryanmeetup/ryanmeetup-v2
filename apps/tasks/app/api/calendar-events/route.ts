import { NextResponse } from "next/server";
import {
  calendarEventDeleteSchema,
  calendarEventSchema,
  calendarEventValues,
} from "@/lib/api-schema/calendar";
import { databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import { recordWorkspaceActivity } from "@/lib/privileged-api";
import { CALENDAR_EVENT_COLUMNS } from "@/lib/calendar-types";

async function record(
  user: Parameters<typeof recordWorkspaceActivity>[0],
  action: string,
  event: { id: string; title: string; project_id: string | null },
) {
  return recordWorkspaceActivity(user, {
    action,
    targetType: "calendar_event",
    targetId: event.id,
    name: event.title,
    href: "/calendar",
    projectId: event.project_id,
  });
}

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) =>
    calendarEventSchema(value),
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const result = await authorization.supabase
    .from("calendar_events")
    .insert({
      ...calendarEventValues(parsed.data, authorization.user.id),
      created_by: authorization.user.id,
    })
    .select(CALENDAR_EVENT_COLUMNS)
    .single();
  if (result.error)
    return databaseFailure(request, "calendar_event.create", result.error, {
      error: "The calendar item could not be saved.",
    });
  if (!(await record(authorization.user, "calendar.create", result.data)))
    return NextResponse.json(
      { error: "The date was saved, but its activity could not be recorded." },
      { status: 500 },
    );
  return NextResponse.json({ event: result.data });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, (value) =>
    calendarEventSchema(value, true),
  );
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const result = await authorization.supabase
    .from("calendar_events")
    .update(calendarEventValues(parsed.data, authorization.user.id, false))
    .eq("id", parsed.data.id!)
    .select(CALENDAR_EVENT_COLUMNS)
    .single();
  if (result.error)
    return databaseFailure(request, "calendar_event.update", result.error, {
      error: "The calendar item could not be updated.",
    });
  if (!(await record(authorization.user, "calendar.update", result.data)))
    return NextResponse.json(
      { error: "The date was updated, but its activity could not be recorded." },
      { status: 500 },
    );
  return NextResponse.json({ event: result.data });
}

export async function DELETE(request: Request) {
  const parsed = await readJson(request, calendarEventDeleteSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const result = await authorization.supabase
    .from("calendar_events")
    .delete()
    .eq("id", parsed.data.id)
    .select(CALENDAR_EVENT_COLUMNS)
    .single();
  if (result.error)
    return databaseFailure(request, "calendar_event.delete", result.error, {
      error: "The calendar item could not be deleted.",
    });
  if (!(await record(authorization.user, "calendar.delete", result.data)))
    return NextResponse.json(
      { error: "The date was deleted, but its activity could not be recorded." },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
