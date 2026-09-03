"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { toast } from "@ryanmeetup/ui";
import { blankCalendarDraft } from "@/lib/api-schema/calendar";
import { recurrenceSpanConflict } from "@/lib/calendar/calendar-recurrence";
import { workspaceGoogleEventId } from "@/lib/calendar/google-calendar-sync";
import {
  calendarEventDraft,
  rememberPublishedEvent,
} from "@/lib/calendar/calendar-view";
import type {
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventKind,
} from "@/lib/calendar/calendar-types";
import type { GoogleCalendarEvent } from "@/lib/calendar/google-calendar-types";
import { mutate } from "@/lib/mutation-client";
import { errorMessage } from "@/lib/presentation";
import type { Profile } from "@/lib/workspace/workspace-types";

export function useCalendarEventEditor({
  currentProfile,
  demoMode,
  events,
  googleEvents,
  googleSyncAvailable,
  initialDraft,
  previewing,
  setEvents,
  setGoogleEvents,
}: {
  currentProfile: Profile;
  demoMode: boolean;
  events: CalendarEvent[];
  googleEvents: GoogleCalendarEvent[];
  googleSyncAvailable: boolean;
  /**
   * Opens the editor already holding this draft. The calendar page leaves it
   * unset and opens the editor from a click; the dedicated editor routes pass
   * one, since on a route the form is the whole page and must be there on the
   * first paint rather than after an effect.
   */
  initialDraft?: CalendarEventDraft | null;
  previewing: boolean;
  setEvents: Dispatch<SetStateAction<CalendarEvent[]>>;
  setGoogleEvents: Dispatch<SetStateAction<GoogleCalendarEvent[]>>;
}) {
  const [draft, setDraft] = useState<CalendarEventDraft | null>(
    initialDraft ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const publishedGoogleIds = useMemo(
    () => new Set(googleEvents.map((event) => event.id)),
    [googleEvents],
  );

  const editingEvent = draft?.id
    ? events.find((event) => event.id === draft.id)
    : null;
  const canEdit =
    !previewing &&
    (!editingEvent ||
      editingEvent.created_by === currentProfile.id ||
      editingEvent.profile_id === currentProfile.id ||
      currentProfile.app_role === "owner");
  const recurrenceConflict = draft
    ? recurrenceSpanConflict(draft.startDate, draft.endDate, draft.recurrence)
    : null;

  function updateDraft<K extends keyof CalendarEventDraft>(
    key: K,
    value: CalendarEventDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  // One dialog covers both kinds, so switching between them carries over what
  // still applies and clears the fields the other kind does not have. The
  // "Out of office" default is treated as a placeholder rather than typing.
  function changeKind(kind: CalendarEventKind) {
    setDraft((current) => {
      if (!current || current.kind === kind) return current;
      const awayTitle = blankCalendarDraft("away", current.startDate).title;
      return {
        ...current,
        kind,
        title:
          kind === "away" && !current.title.trim()
            ? awayTitle
            : kind === "important" && current.title === awayTitle
              ? ""
              : current.title,
        profileId:
          kind === "away" ? current.profileId || currentProfile.id : "",
        projectId: kind === "important" ? current.projectId : "",
        categoryId: kind === "important" ? current.categoryId : "",
      };
    });
  }

  function openNew(kind: CalendarEventKind, date: string) {
    setDraft({
      ...blankCalendarDraft(kind, date),
      profileId: kind === "away" ? currentProfile.id : "",
    });
  }

  function openEvent(event: CalendarEvent) {
    setDraft(
      calendarEventDraft(
        event,
        publishedGoogleIds.has(workspaceGoogleEventId(event.id)),
      ),
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      let saved: CalendarEvent;
      let warning: string | null = null;
      if (demoMode) {
        const now = new Date().toISOString();
        saved = {
          id: draft.id ?? crypto.randomUUID(),
          kind: draft.kind,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          starts_at: `${draft.startDate}T${draft.allDay ? "00:00" : draft.startTime}:00`,
          ends_at: `${draft.endDate}T${draft.allDay ? "23:59" : draft.endTime}:00`,
          all_day: draft.allDay,
          recurrence: draft.recurrence,
          project_id:
            draft.kind === "important" ? draft.projectId || null : null,
          category_id:
            draft.kind === "important" ? draft.categoryId || null : null,
          profile_id: draft.kind === "away" ? draft.profileId : null,
          created_by: currentProfile.id,
          created_at:
            events.find((item) => item.id === draft.id)?.created_at ?? now,
          updated_at: now,
        };
      } else {
        const response = await mutate<{
          event: CalendarEvent;
          warning?: string | null;
        }>("/api/calendar-events", {
          method: draft.id ? "PATCH" : "POST",
          body: JSON.stringify(draft),
        });
        saved = response.event;
        warning = response.warning ?? null;
      }
      setEvents((current) =>
        current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved],
      );
      if (googleSyncAvailable)
        setGoogleEvents((current) =>
          rememberPublishedEvent(
            current,
            saved,
            draft.syncToGoogle && !warning,
          ),
        );
      setDraft(null);
      toast.success(
        draft.id ? "Calendar item updated." : "Calendar item added.",
      );
      if (warning) toast.error(warning);
    } catch (error) {
      toast.error(errorMessage(error, "The calendar item could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft?.id) return;
    setDeleting(true);
    const deletedId = draft.id;
    try {
      let warning: string | null = null;
      if (!demoMode)
        warning =
          (
            await mutate<{ warning?: string | null }>("/api/calendar-events", {
              method: "DELETE",
              body: JSON.stringify({ id: deletedId }),
            })
          ).warning ?? null;
      setEvents((current) => current.filter((item) => item.id !== deletedId));
      if (googleSyncAvailable && !warning)
        setGoogleEvents((current) =>
          current.filter(
            (item) => item.id !== workspaceGoogleEventId(deletedId),
          ),
        );
      setDraft(null);
      toast.success("Calendar item deleted.");
      if (warning) toast.error(warning);
    } catch (error) {
      toast.error(
        errorMessage(error, "The calendar item could not be deleted."),
      );
    } finally {
      setDeleting(false);
    }
  }

  return {
    canEdit,
    changeKind,
    deleting,
    draft,
    editingEvent,
    openEvent,
    openNew,
    recurrenceConflict,
    remove,
    save,
    saving,
    setDraft,
    updateDraft,
  };
}
