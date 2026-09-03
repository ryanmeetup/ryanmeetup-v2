"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  editorPageContentClassName,
  WorkspacePageShell,
} from "@/components/global";
import { blankCalendarDraft } from "@/lib/api-schema/calendar";
import { calendarEventDraft } from "@/lib/calendar/calendar-view";
import type {
  CalendarEvent,
  CalendarEventKind,
} from "@/lib/calendar/calendar-types";
import type { GoogleCalendarEvent } from "@/lib/calendar/google-calendar-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { CalendarEventEditorModal } from "./CalendarEventEditorModal";
import { useCalendarEventEditor } from "./useCalendarEventEditor";

/**
 * `/calendar/event/new` and `/calendar/event/[id]/edit` — the calendar event
 * editor as a page.
 *
 * `useCalendarEventEditor` shows the form whenever it holds a draft. On a route
 * the form is the whole page, so the draft is seeded at mount and the draft
 * being cleared — by cancel, by a save, or by a delete — is the way out.
 * Everything else is the controller the calendar page already uses.
 */
export function CalendarEventEditorPageClient({
  initialData,
  demoMode,
  events,
  event,
  kind,
  date,
  googleEmail,
  googleSyncAvailable,
  backHref,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  /** Every event, so the controller can resolve the one being edited. */
  events: CalendarEvent[];
  /** Omitted for the create route. */
  event?: CalendarEvent;
  kind: CalendarEventKind;
  /** The day a new event starts on, as `YYYY-MM-DD`. */
  date: string;
  googleEmail?: string;
  googleSyncAvailable: boolean;
  backHref: string;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentEvents, setEvents] = useState(events);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const router = useRouter();
  const previewing = Boolean(data.accessPreview);

  const [initialDraft] = useState(() =>
    event
      ? // Nothing on this route has been published to Google from here yet, so
        // the copy the calendar page tracks is the calendar page's business.
        calendarEventDraft(event, false)
      : {
          ...blankCalendarDraft(kind, date),
          profileId: kind === "away" ? initialData.currentProfile.id : "",
        },
  );

  const editor = useCalendarEventEditor({
    currentProfile: data.currentProfile,
    demoMode,
    events: currentEvents,
    googleEvents,
    googleSyncAvailable,
    initialDraft,
    previewing,
    setEvents,
    setGoogleEvents,
  });

  const finished = !editor.draft;
  useEffect(() => {
    if (finished) router.push(backHref);
  }, [backHref, finished, router]);

  return (
    <WorkspacePageShell
      data={data}
      demoMode={demoMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      setData={setData}
      contentClassName={editorPageContentClassName}
    >
      <CalendarEventEditorModal
        presentation="page"
        backHref={backHref}
        categories={data.categories}
        currentProfileId={data.currentProfile.id}
        editor={editor}
        googleEmail={googleEmail}
        googleSyncAvailable={googleSyncAvailable}
        previewing={previewing}
        profiles={data.profiles}
        projects={data.projects}
      />
    </WorkspacePageShell>
  );
}
