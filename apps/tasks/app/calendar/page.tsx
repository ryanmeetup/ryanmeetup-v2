import type { Metadata } from "next";
import { CalendarPageClient } from "@/components/calendar";
import { demoData } from "@/lib/demo-data";
import {
  CALENDAR_EVENT_COLUMNS,
  type CalendarEvent,
} from "@/lib/calendar-types";
import { requireQueryData } from "@/lib/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";

export const metadata: Metadata = {
  title: { absolute: "Calendar | Ryan Meetup Tasks" },
};

const demoEvents: CalendarEvent[] = [
  {
    id: "demo-away",
    kind: "away",
    title: "Ryan is away",
    description: "Back online Monday.",
    starts_at: "2026-08-27T00:00:00",
    ends_at: "2026-08-30T23:59:00",
    all_day: true,
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
    project_id: "ryancon-2027",
    category_id: null,
    profile_id: null,
    created_by: "ryan",
    created_at: "2026-08-20T12:00:00Z",
    updated_at: "2026-08-20T12:00:00Z",
  },
];

export default async function CalendarPage() {
  const demoMode = isWorkspaceDemo();
  if (demoMode)
    return (
      <CalendarPageClient
        initialData={demoData}
        initialEvents={demoEvents}
        demoMode
        initialMonth={new Date().toISOString().slice(0, 7)}
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
  const events = requireQueryData(
    "calendar events",
    await loaded.supabase
      .from("calendar_events")
      .select(CALENDAR_EVENT_COLUMNS)
      .order("starts_at"),
  );
  return (
    <CalendarPageClient
      initialData={loaded.data}
      initialEvents={events}
      demoMode={false}
      initialMonth={new Date().toISOString().slice(0, 7)}
    />
  );
}
