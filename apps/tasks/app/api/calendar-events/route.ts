import { NextResponse } from "next/server";
import {
  calendarEventDeleteSchema,
  calendarEventSchema,
  calendarEventValues,
} from "@/lib/api-schema/calendar";
import { databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import { syncWorkspaceEventToGoogle } from "@/lib/server/google-calendar";
import {
  CALENDAR_EVENT_COLUMNS,
  type CalendarEvent,
} from "@/lib/calendar/calendar-types";

// Publishing is best effort: the workspace row is already saved, so a Google
// failure is reported as a warning instead of discarding the write.
async function syncToGoogle(
  supabase: Parameters<typeof syncWorkspaceEventToGoogle>[0],
  event: CalendarEvent,
  publish: boolean,
) {
  try {
    return await syncWorkspaceEventToGoogle(supabase, event, publish);
  } catch (error) {
    console.error("Google Calendar copy could not be updated", error);
    return "Google Calendar could not be updated.";
  }
}

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) => calendarEventSchema(value));
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const result = await authorization.supabase
    .from("calendar_events")
    .insert({
      ...calendarEventValues(parsed.data),
      created_by: authorization.user.id,
    })
    .select(CALENDAR_EVENT_COLUMNS)
    .single();
  if (result.error)
    return databaseFailure(request, "calendar_event.create", result.error, {
      error: "The calendar item could not be saved.",
    });
  const warning = parsed.data.syncToGoogle
    ? await syncToGoogle(authorization.supabase, result.data, true)
    : null;
  return NextResponse.json({ event: result.data, warning });
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
    .update(calendarEventValues(parsed.data))
    .eq("id", parsed.data.id!)
    .select(CALENDAR_EVENT_COLUMNS)
    .single();
  if (result.error)
    return databaseFailure(request, "calendar_event.update", result.error, {
      error: "The calendar item could not be updated.",
    });
  // An edit reconciles the copy in both directions, so clearing the option
  // removes a date that was published earlier.
  const warning = await syncToGoogle(
    authorization.supabase,
    result.data,
    parsed.data.syncToGoogle,
  );
  return NextResponse.json({ event: result.data, warning });
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
  const warning = await syncToGoogle(
    authorization.supabase,
    result.data,
    false,
  );
  return NextResponse.json({ ok: true, warning });
}
