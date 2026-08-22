import type { Metadata } from "next";
import { CalendarPageClient } from "@/components/calendar";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  calendarEventsForPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access/access-preview";
import { resolveAccessPreview } from "@/lib/server/access-preview";
import { demoData } from "@/lib/workspace/demo-data";
import {
  CALENDAR_EVENT_COLUMNS,
  type CalendarEvent,
} from "@/lib/calendar/calendar-types";
import { requireQueryData } from "@/lib/server/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import {
  canViewWorkspaceGoogleCalendar,
  googleCalendarConnection,
  isGoogleCalendarConfigured,
  loadGoogleCalendarIntegration,
  listGoogleCalendarEvents,
} from "@/lib/server/google-calendar";
import type { GoogleCalendarEvent } from "@/lib/calendar/google-calendar-types";
import type { AccessPreview } from "@/lib/workspace/workspace-types";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Calendar") } };
}

const demoEvents: CalendarEvent[] = [
  {
    id: "demo-away",
    kind: "away",
    title: "Ryan is away",
    description: "Back online Monday.",
    starts_at: "2026-08-27T00:00:00",
    ends_at: "2026-08-30T23:59:00",
    all_day: true,
    recurrence: null,
    project_id: null,
    category_id: null,
    profile_id: "ryan",
    created_by: "ryan",
    created_at: "2026-08-20T12:00:00Z",
    updated_at: "2026-08-20T12:00:00Z",
  },
  {
    id: "demo-important",
    kind: "important",
    title: "RyanCon venue decision",
    description: "Final go/no-go date.",
    starts_at: "2026-08-24T00:00:00",
    ends_at: "2026-08-24T23:59:00",
    all_day: true,
    recurrence: null,
    project_id: "ryancon-2027",
    category_id: null,
    profile_id: null,
    created_by: "ryan",
    created_at: "2026-08-20T12:00:00Z",
    updated_at: "2026-08-20T12:00:00Z",
  },
  {
    id: "demo-recurring",
    kind: "important",
    title: "Weekly Ryan sync",
    description: "Same time every week until the conference.",
    starts_at: "2026-08-26T00:00:00",
    ends_at: "2026-08-26T23:59:00",
    all_day: true,
    recurrence: {
      frequency: "weekly",
      interval: 1,
      weekdays: [3],
      monthlyMode: "date",
      ends: { type: "never" },
    },
    project_id: null,
    category_id: null,
    profile_id: null,
    created_by: "ryan",
    created_at: "2026-08-20T12:00:00Z",
    updated_at: "2026-08-20T12:00:00Z",
  },
];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialMonth = new Date().toISOString().slice(0, 7);
  const query = await searchParams;
  const googleStatus = typeof query.google === "string" ? query.google : undefined;
  const requestedGroupPreview =
    typeof query[ACCESS_PREVIEW_PARAM] === "string"
      ? query[ACCESS_PREVIEW_PARAM]
      : undefined;
  const requestedUserPreview =
    typeof query[USER_ACCESS_PREVIEW_PARAM] === "string"
      ? query[USER_ACCESS_PREVIEW_PARAM]
      : undefined;
  const demoMode = isWorkspaceDemo();
  if (demoMode)
    return (
      <CalendarPageClient
        initialData={demoData}
        initialEvents={demoEvents}
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
  const loaded = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "projects",
    "tasks",
    "subtasks",
    "taskAssignees",
    "taskCategories",
  ]);
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
  // A preview is read-only, so it never offers connection management.
  const googleCanManage =
    !preview && loaded.data.currentProfile.app_role === "owner";
  let googleCanView = googleCanManage;
  if (preview) {
    googleCanView = preview.calendarAccess === true;
  } else if (!googleCanView) {
    try {
      googleCanView = await canViewWorkspaceGoogleCalendar(loaded.supabase);
    } catch (error) {
      console.error("Google Calendar permission could not be resolved", error);
    }
  }
  let integration = null;
  if (googleCanView || googleCanManage) {
    try {
      integration = await loadGoogleCalendarIntegration();
    } catch (error) {
      console.error("Google Calendar connection could not be loaded", error);
    }
  }
  const googleConnection = googleCalendarConnection(integration);
  let googleEvents: GoogleCalendarEvent[] = [];
  if (googleCanView && integration) {
    try {
      googleEvents = await listGoogleCalendarEvents(integration, initialMonth);
    } catch (error) {
      console.error("Google Calendar could not be loaded on the calendar page", error);
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
