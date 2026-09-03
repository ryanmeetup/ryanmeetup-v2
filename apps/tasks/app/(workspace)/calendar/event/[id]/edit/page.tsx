import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarEventEditorPageClient } from "@/components/calendar";
import { CALENDAR_EVENT_COLUMNS } from "@/lib/calendar/calendar-types";
import { demoCalendarEvents, demoData } from "@/lib/workspace/demo-data";
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
  return { title: { absolute: await pageTitle("Edit Calendar Item") } };
}

/** The mobile edit route; `/calendar` keeps the dialog for desktop. */
export default async function EditCalendarEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/calendar");
  redirectAccessPreviewAway(query, backHref);

  const today = new Date().toISOString().slice(0, 10);

  if (await isWorkspaceDemo()) {
    const demoEvent = demoCalendarEvents.find((item) => item.id === id);
    if (!demoEvent) notFound();
    return (
      <CalendarEventEditorPageClient
        initialData={demoData}
        demoMode
        events={demoCalendarEvents}
        event={demoEvent}
        kind={demoEvent.kind}
        date={today}
        googleSyncAvailable={false}
        backHref={backHref}
      />
    );
  }

  const loaded = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "projects",
  ]);
  const events = requireQueryData(
    "calendar events",
    await loaded.supabase
      .from("calendar_events")
      .select(CALENDAR_EVENT_COLUMNS)
      .order("starts_at"),
  );
  // RLS decides what came back, so an event missing from the load is one this
  // member cannot reach — the same answer as one that does not exist.
  const event = events.find((item) => item.id === id);
  if (!event) notFound();

  const { googleCanView, googleConnection } = await loadGoogleCalendarAccess(
    loaded.supabase,
    { owner: loaded.data.currentProfile.app_role === "owner" },
  );

  return (
    <CalendarEventEditorPageClient
      initialData={loaded.data}
      demoMode={false}
      events={events}
      event={event}
      kind={event.kind}
      date={today}
      googleEmail={googleConnection.email}
      googleSyncAvailable={googleCanView && googleConnection.connected}
      backHref={backHref}
    />
  );
}
