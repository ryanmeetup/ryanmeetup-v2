import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarPageClient } from "@/components/calendar";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  calendarEventsForPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access/access-preview";
import { canViewWorkspaceArea } from "@/lib/access/workspace-areas";
import { resolveAccessPreview } from "@/lib/server/access-preview";
import { demoCalendarEvents, demoData } from "@/lib/workspace/demo-data";
import { CALENDAR_EVENT_COLUMNS } from "@/lib/calendar/calendar-types";
import { requireQueryData } from "@/lib/server/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import {
  isGoogleCalendarConfigured,
  listGoogleCalendarEvents,
  loadGoogleCalendarAccess,
} from "@/lib/server/google-calendar";
import type { GoogleCalendarEvent } from "@/lib/calendar/google-calendar-types";
import type { AccessPreview } from "@/lib/workspace/workspace-types";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Calendar") } };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialMonth = new Date().toISOString().slice(0, 7);
  const query = await searchParams;
  const googleStatus =
    typeof query.google === "string" ? query.google : undefined;
  const requestedGroupPreview =
    typeof query[ACCESS_PREVIEW_PARAM] === "string"
      ? query[ACCESS_PREVIEW_PARAM]
      : undefined;
  const requestedUserPreview =
    typeof query[USER_ACCESS_PREVIEW_PARAM] === "string"
      ? query[USER_ACCESS_PREVIEW_PARAM]
      : undefined;
  const demoMode = await isWorkspaceDemo();
  if (demoMode)
    return (
      <CalendarPageClient
        initialData={demoData}
        initialEvents={demoCalendarEvents}
        initialGoogleEvents={[]}
        googleConnection={{ connected: false }}
        googleConfigured={false}
        googleCanManage={false}
        googleCanView={false}
        googleStatus={googleStatus}
        demoMode
        initialMonth={initialMonth}
      />
    );
  const loaded = await loadWorkspacePage(
    [
      "profiles",
      "statuses",
      "categories",
      "projects",
      "tasks",
      "subtasks",
      "taskAssignees",
      "taskCategories",
    ],
    { area: "calendar" },
  );
  let initialData = loaded.data;
  let events = requireQueryData(
    "calendar events",
    await loaded.supabase
      .from("calendar_events")
      .select(CALENDAR_EVENT_COLUMNS)
      .order("starts_at"),
  );
  let preview: AccessPreview | undefined;
  if (requestedGroupPreview || requestedUserPreview) {
    const isOwner = requireQueryData(
      "owner access",
      await loaded.supabase.rpc("is_app_owner"),
    );
    if (isOwner) {
      const resolvedPreview = await resolveAccessPreview(loaded.supabase, {
        groupId: requestedGroupPreview,
        userName: requestedUserPreview,
        allProjectIds: initialData.projects.map((project) => project.id),
      });
      if (resolvedPreview) {
        initialData = applyAccessPreview(
          initialData,
          resolvedPreview.preview,
          resolvedPreview.projectIds,
        );
        events = calendarEventsForPreview(
          events,
          resolvedPreview.preview,
          resolvedPreview.projectIds,
        );
        preview = resolvedPreview.preview;
      }
    }
  }
  // Previewing a group that cannot reach this page must answer the way the
  // member does, the way a task outside the preview's projects already 404s.
  if (!canViewWorkspaceArea(initialData.accessibleAreas, "calendar"))
    notFound();

  const { googleCanManage, googleCanView, integration, googleConnection } =
    await loadGoogleCalendarAccess(loaded.supabase, {
      owner: loaded.data.currentProfile.app_role === "owner",
      preview,
    });
  let googleEvents: GoogleCalendarEvent[] = [];
  if (googleCanView && integration) {
    try {
      googleEvents = await listGoogleCalendarEvents(integration, initialMonth);
    } catch (error) {
      console.error(
        "Google Calendar could not be loaded on the calendar page",
        error,
      );
    }
  }
  return (
    <CalendarPageClient
      initialData={initialData}
      initialEvents={events}
      initialGoogleEvents={googleEvents}
      googleConnection={googleConnection}
      googleConfigured={isGoogleCalendarConfigured()}
      googleCanManage={googleCanManage}
      googleCanView={googleCanView}
      googleStatus={googleStatus}
      demoMode={false}
      initialMonth={initialMonth}
    />
  );
}
