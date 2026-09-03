import type { Metadata } from "next";
import { CalendarEventEditorPageClient } from "@/components/calendar";
import {
  CALENDAR_EVENT_COLUMNS,
  type CalendarEventKind,
} from "@/lib/calendar/calendar-types";
import { demoData } from "@/lib/workspace/demo-data";
import {
  editorBackHref,
  redirectAccessPreviewAway,
} from "@/lib/server/editor-page-loader";
import { loadGoogleCalendarAccess } from "@/lib/server/google-calendar";
import { requireQueryData } from "@/lib/server/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Add to Calendar") } };
}

const CALENDAR_COLLECTIONS = [
  "profiles",
  "statuses",
  "categories",
  "projects",
] as const;

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** The mobile create route; `/calendar` keeps the dialog for desktop. */
export default async function NewCalendarEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/calendar");
  redirectAccessPreviewAway(query, backHref);

  const kind: CalendarEventKind = query.kind === "away" ? "away" : "important";
  const date =
    typeof query.date === "string" && isoDate.test(query.date)
      ? query.date
      : new Date().toISOString().slice(0, 10);

  if (await isWorkspaceDemo()) {
    return (
      <CalendarEventEditorPageClient
        initialData={demoData}
        demoMode
        events={[]}
        kind={kind}
        date={date}
        googleSyncAvailable={false}
        backHref={backHref}
      />
    );
  }

  const loaded = await loadWorkspacePage([...CALENDAR_COLLECTIONS]);
  const events = requireQueryData(
    "calendar events",
    await loaded.supabase
      .from("calendar_events")
      .select(CALENDAR_EVENT_COLUMNS)
      .order("starts_at"),
  );
  const { googleCanView, googleConnection } = await loadGoogleCalendarAccess(
    loaded.supabase,
    { owner: loaded.data.currentProfile.app_role === "owner" },
  );

  return (
    <CalendarEventEditorPageClient
      initialData={loaded.data}
      demoMode={false}
      events={events}
      kind={kind}
      date={date}
      googleEmail={googleConnection.email}
      googleSyncAvailable={googleCanView && googleConnection.connected}
      backHref={backHref}
    />
  );
}
