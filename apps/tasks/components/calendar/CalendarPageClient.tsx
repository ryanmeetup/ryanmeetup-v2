"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Avatar,
  Button,
  Card,
  DropdownSelect,
  EmptyState,
  Input,
  Modal,
  Pill,
  Spinner,
  Textarea,
  toast,
  Tooltip,
} from "@ryanmeetup/ui";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiExternalLink,
  FiFolder,
  FiInfo,
  FiMoreHorizontal,
  FiPlus,
  FiSidebar,
  FiTrash2,
  FiUsers,
  FiUserX,
  FiX,
} from "react-icons/fi";
import { CountBadge, WorkspacePageShell } from "@/components/global";
import { GoogleEventModal } from "./GoogleEventModal";
import {
  TaskCategoryBadge,
  TaskKeyBadge,
  TaskPriorityBadge,
} from "@/components/tasks";
import {
  blankCalendarDraft,
} from "@/lib/api-schema/calendar";
import {
  calendarItems,
  compareCalendarItems,
  displayTime,
  itemsOnDate,
  monthBounds,
  workspaceTimeZoneLabel,
  type CalendarEvent,
  type CalendarEventDraft,
  type CalendarEventKind,
  type CalendarItem,
} from "@/lib/calendar/calendar-types";
import {
  parseRecurrence,
  recurrenceSpanConflict,
} from "@/lib/calendar/calendar-recurrence";
import { workspaceGoogleEventId } from "@/lib/calendar/google-calendar-sync";
import { CalendarRecurrenceFields } from "./CalendarRecurrenceFields";
import { mutate, parseMutationResponse } from "@/lib/mutation-client";
import { withAccessPreview } from "@/lib/access/access-preview";
import { profileDisplayName } from "@/lib/presentation";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import type {
  GoogleCalendarConnection,
  GoogleCalendarEvent,
} from "@/lib/calendar/google-calendar-types";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const calendarSidebarStorageKey = "ryanmeetup.tasks.calendar-sidebar-open";

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

function compareTaskItems(left: CalendarItem, right: CalendarItem) {
  const priorityDifference =
    priorityOrder[left.task?.priority ?? "low"] -
    priorityOrder[right.task?.priority ?? "low"];
  if (priorityDifference) return priorityDifference;
  const leftTime = left.task?.due_time ?? "99:99";
  const rightTime = right.task?.due_time ?? "99:99";
  return leftTime.localeCompare(rightTime) || left.title.localeCompare(right.title);
}

function moveMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return next.toISOString().slice(0, 7);
}

function eventDraft(
  event: CalendarEvent,
  syncedToGoogle: boolean,
): CalendarEventDraft {
  return {
    id: event.id,
    kind: event.kind,
    title: event.title,
    description: event.description ?? "",
    startDate: event.starts_at.slice(0, 10),
    endDate: event.ends_at.slice(0, 10),
    allDay: event.all_day,
    startTime: event.starts_at.slice(11, 16) || "09:00",
    endTime: event.ends_at.slice(11, 16) || "17:00",
    recurrence: parseRecurrence(event.recurrence),
    projectId: event.project_id ?? "",
    categoryId: event.category_id ?? "",
    profileId: event.profile_id ?? "",
    syncToGoogle: syncedToGoogle,
  };
}

// Keeps the locally known Google copy in step with a save so the editor can
// answer "is this on Google?" without another round trip.
function rememberPublishedEvent(
  events: GoogleCalendarEvent[],
  event: CalendarEvent,
  published: boolean,
): GoogleCalendarEvent[] {
  const id = workspaceGoogleEventId(event.id);
  const others = events.filter((item) => item.id !== id);
  return published
    ? [
        ...others,
        {
          id,
          title: event.title,
          start: event.starts_at.slice(0, 10),
          end: event.ends_at.slice(0, 10),
          allDay: event.all_day,
          startTime: event.all_day ? undefined : event.starts_at.slice(11, 16),
          endTime: event.all_day ? undefined : event.ends_at.slice(11, 16),
        },
      ]
    : others;
}

function Item({ item, onOpen }: { item: CalendarItem; onOpen: () => void }) {
  const sourceClassName = item.source === "google"
    ? "bg-blue-500/10 hover:bg-blue-500/15 dark:bg-blue-400/10 dark:hover:bg-blue-400/15"
    : item.source === "away"
      ? "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-400/10 dark:hover:bg-amber-400/15"
      : "bg-black/[0.035] hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/10";
  const className =
    `block min-w-0 rounded-md border-l-4 px-2 py-1 text-left text-[11px] leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40 ${sourceClassName}`;
  const content = (
    <>
      <span className="block truncate font-semibold">{item.title}</span>
      {item.meta && (
        <span className="block truncate text-[10px] text-black/55 dark:text-white/55">
          {item.meta}
        </span>
      )}
    </>
  );
  if (item.href && item.external)
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        style={{ borderColor: item.color }}
      >
        {content}
      </a>
    );
  if (item.href)
    return (
      <Link href={item.href} className={className} style={{ borderColor: item.color }}>
        {content}
      </Link>
    );
  return (
    <button
      type="button"
      className={`${className} w-full`}
      style={{ borderColor: item.color }}
      // A Google tile opens a read-only dialog rather than the editor, which is
      // worth saying where the tile itself only shows a title and a time.
      aria-label={item.google ? `${item.title} — view event details` : undefined}
      onClick={onOpen}
    >
      {content}
    </button>
  );
}

function TaskSummary({
  date,
  items,
  onOpen,
}: {
  date: string;
  items: CalendarItem[];
  onOpen: (date: string, items: CalendarItem[]) => void;
}) {
  return (
    <button
      type="button"
      className="block w-full min-w-0 rounded-md border-l-4 border-fuchsia-600 bg-fuchsia-500/[0.08] px-2 py-1 text-left text-[11px] leading-tight transition hover:bg-fuchsia-500/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40 dark:border-fuchsia-400 dark:bg-fuchsia-400/10 dark:hover:bg-fuchsia-400/15"
      onClick={() => onOpen(date, items)}
    >
      <span className="block truncate font-semibold">
        {items.length} {items.length === 1 ? "task" : "tasks"} due
      </span>
      <span className="block truncate text-[10px] text-black/55 dark:text-white/55">
        View the day&apos;s deadlines
      </span>
    </button>
  );
}

function SyncingItems({ rows }: { rows: number }) {
  return (
    <div className="space-y-1" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={`syncing:${index}`}
          className="h-9 animate-pulse rounded-md border-l-4 border-blue-500/25 bg-black/[0.05] motion-reduce:animate-none dark:border-blue-400/25 dark:bg-white/[0.07]"
        />
      ))}
    </div>
  );
}

function SyncingNote({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-200 ${className}`}>
      <Spinner size={14} label="Syncing Google Calendar" />
      Syncing Google events…
    </p>
  );
}

function SyncingBanner() {
  return (
    <div className="relative mb-3 overflow-hidden rounded-xl border border-blue-500/30 bg-blue-500/[0.08] px-3 py-2.5 dark:border-blue-400/30 dark:bg-blue-400/[0.12]">
      <SyncingNote className="text-sm" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 block h-0.5 overflow-hidden">
        <span className="block h-full w-1/4 animate-sync-sweep rounded-full bg-blue-600/80 motion-reduce:w-full motion-reduce:animate-none dark:bg-blue-300/80" />
      </span>
    </div>
  );
}

export function CalendarPageClient({
  initialData,
  initialEvents,
  initialGoogleEvents,
  googleConnection: initialGoogleConnection,
  googleConfigured,
  googleCanManage,
  googleCanView,
  googleStatus,
  initialMonth,
  demoMode,
}: {
  initialData: WorkspaceData;
  initialEvents: CalendarEvent[];
  initialGoogleEvents: GoogleCalendarEvent[];
  googleConnection: GoogleCalendarConnection;
  googleConfigured: boolean;
  googleCanManage: boolean;
  googleCanView: boolean;
  googleStatus?: string;
  initialMonth: string;
  demoMode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [events, setEvents] = useState(initialEvents);
  const [googleEvents, setGoogleEvents] = useState(initialGoogleEvents);
  const [loadedGoogleMonth, setLoadedGoogleMonth] = useState(initialMonth);
  const [googleConnection, setGoogleConnection] = useState(initialGoogleConnection);
  const [googleSettingsOpen, setGoogleSettingsOpen] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [month, setMonth] = useState(initialMonth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calendarSidebarOpen, setCalendarSidebarOpen] = useState(true);
  const [draft, setDraft] = useState<CalendarEventDraft | null>(null);
  const [googleEventId, setGoogleEventId] = useState<string | null>(null);
  const [dayAgenda, setDayAgenda] = useState<{
    date: string;
    items: CalendarItem[];
  } | null>(null);
  const [taskSummary, setTaskSummary] = useState<{
    date: string;
    items: CalendarItem[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [source, setSource] = useState("all");
  const previewing = Boolean(data.accessPreview);
  // Publishing is only offered where the shared calendar is already visible,
  // which is also how the modal knows a date is already on Google.
  const googleSyncAvailable =
    !demoMode && googleCanView && googleConnection.connected;
  // Reading the open event back out of the loaded month keeps the dialog on the
  // current copy, and closes it by itself when the month it belongs to is
  // replaced or the connection goes away.
  const googleEvent =
    googleEvents.find((event) => event.id === googleEventId) ?? null;
  const publishedGoogleIds = useMemo(
    () => new Set(googleEvents.map((event) => event.id)),
    [googleEvents],
  );
  const googleLoading =
    googleCanView && googleConnection.connected && month !== loadedGoogleMonth;
  const googleSyncing =
    googleLoading && (source === "all" || source === "google");
  const { days, monthNumber } = monthBounds(month);
  const currentDate = new Date().toISOString().slice(0, 10);
  const today = currentDate.slice(0, 7) === month ? currentDate : "";
  const allItems = useMemo(
    () => {
      // The grid is the widest thing drawn from these items, so it also bounds
      // how far a repeating date is expanded.
      const grid = monthBounds(month).days;
      return calendarItems(
        data.tasks,
        events,
        data.projects,
        data.categories,
        data.profiles,
        googleEvents,
        { start: grid[0], end: grid[grid.length - 1] },
      );
    },
    [
      data.categories,
      data.profiles,
      data.projects,
      data.tasks,
      events,
      googleEvents,
      month,
    ],
  );
  const items = source === "all"
    ? allItems
    : allItems.filter((item) => item.source === source);
  const monthStart = `${month}-01`;
  const monthEnd = `${moveMonth(month, 1)}-01`;
  const monthItems = items.filter(
    (item) => item.start < monthEnd && item.end >= monthStart,
  );
  const agendaDates = days.filter(
    (date) =>
      date >= monthStart &&
      date < monthEnd &&
      itemsOnDate(monthItems, date).length > 0,
  );
  const upcomingDates = agendaDates.filter((date) => date >= currentDate);
  const profiles = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const updateDraft = <K extends keyof CalendarEventDraft>(
    key: K,
    value: CalendarEventDraft[K],
  ) => setDraft((current) => current ? { ...current, [key]: value } : current);

  function toggleCalendarSidebar() {
    setCalendarSidebarOpen((current) => {
      const next = !current;
      localStorage.setItem(calendarSidebarStorageKey, String(next));
      return next;
    });
  }

  function openNew(kind: CalendarEventKind, date = today || `${month}-01`) {
    setDraft({
      ...blankCalendarDraft(kind, date),
      profileId: kind === "away" ? data.currentProfile.id : "",
    });
  }

  // Workspace rows open the editor. An imported Google event is not ours to
  // change, so it opens the details dialog, which is where the invite Google
  // holds—notes, guests, joining details—is read without leaving Tasks.
  function openItem(item: CalendarItem) {
    if (item.google) {
      setGoogleEventId(item.google.id);
      return;
    }
    if (item.event)
      setDraft(
        eventDraft(
          item.event,
          publishedGoogleIds.has(workspaceGoogleEventId(item.event.id)),
        ),
      );
  }

  function renderDayItems(
    date: string,
    dateItems: CalendarItem[],
    limit = 3,
  ) {
    const orderedItems = [...dateItems].sort(compareCalendarItems);
    const awayItems = orderedItems.filter((item) => item.source === "away");
    const taskItems = orderedItems.filter((item) => item.source === "task");
    const otherItems = orderedItems.filter(
      (item) => item.source !== "away" && item.source !== "task",
    );
    const finiteLimit = Number.isFinite(limit);
    let slotsLeft = finiteLimit ? limit : orderedItems.length + 1;
    const visibleAwayItems = awayItems.slice(0, slotsLeft);
    slotsLeft -= visibleAwayItems.length;
    const showTaskSummary = taskItems.length > 0 && slotsLeft > 0;
    if (showTaskSummary) slotsLeft -= 1;
    const visibleOtherItems = otherItems.slice(0, slotsLeft);
    const visibleItemCount =
      visibleAwayItems.length +
      (showTaskSummary ? taskItems.length : 0) +
      visibleOtherItems.length;
    const hiddenCount = Math.max(0, orderedItems.length - visibleItemCount);
    return (
      <>
        {visibleAwayItems.map((item) => (
          <Item key={item.id} item={item} onOpen={() => openItem(item)} />
        ))}
        {showTaskSummary && (
          <TaskSummary
            date={date}
            items={taskItems}
            onOpen={(summaryDate, summaryItems) =>
              setTaskSummary({ date: summaryDate, items: summaryItems })
            }
          />
        )}
        {visibleOtherItems.map((item) => (
          <Item key={item.id} item={item} onOpen={() => openItem(item)} />
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-[10px] font-semibold text-black/65 transition hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/65 dark:hover:bg-white/[0.08] dark:focus-visible:ring-white/40"
            onClick={() => setDayAgenda({ date, items: orderedItems })}
          >
            <FiMoreHorizontal aria-hidden />
            View {hiddenCount} more
          </button>
        )}
      </>
    );
  }

  async function saveEvent(event: FormEvent) {
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
          project_id: draft.kind === "important" ? draft.projectId || null : null,
          category_id: draft.kind === "important" ? draft.categoryId || null : null,
          profile_id: draft.kind === "away" ? draft.profileId : null,
          created_by: data.currentProfile.id,
          created_at: events.find((item) => item.id === draft.id)?.created_at ?? now,
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
      setEvents((current) => current.some((item) => item.id === saved.id)
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved]);
      // The published copy is tracked alongside imported Google events so the
      // editor still shows the date as synced before the next month load.
      if (googleSyncAvailable)
        setGoogleEvents((current) =>
          rememberPublishedEvent(current, saved, draft.syncToGoogle && !warning),
        );
      setDraft(null);
      toast.success(draft.id ? "Calendar item updated." : "Calendar item added.");
      if (warning) toast.error(warning);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The calendar item could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
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
      toast.error(error instanceof Error ? error.message : "The calendar item could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  const recurrenceConflict = draft
    ? recurrenceSpanConflict(draft.startDate, draft.endDate, draft.recurrence)
    : null;
  const editingEvent = draft?.id ? events.find((event) => event.id === draft.id) : null;
  const canEdit =
    !previewing &&
    (!editingEvent ||
      editingEvent.created_by === data.currentProfile.id ||
      editingEvent.profile_id === data.currentProfile.id ||
      data.currentProfile.app_role === "owner");

  useEffect(() => {
    const saved = localStorage.getItem(calendarSidebarStorageKey);
    if (saved === null) return;
    queueMicrotask(() => setCalendarSidebarOpen(saved === "true"));
  }, []);

  useEffect(() => {
    const messages: Record<string, { kind: "success" | "error"; text: string }> = {
      connected: { kind: "success", text: "Google Calendar connected." },
      invalid: { kind: "error", text: "Google Calendar returned an invalid connection request." },
      auth: { kind: "error", text: "Sign in again before connecting Google Calendar." },
      unavailable: { kind: "error", text: "Google Calendar has not been configured for this deployment." },
      "refresh-token": { kind: "error", text: "Google did not provide ongoing calendar access. Try connecting again." },
      failed: { kind: "error", text: "Google Calendar could not be connected." },
    };
    const message = googleStatus ? messages[googleStatus] : undefined;
    if (message) toast[message.kind](message.text);
  }, [googleStatus]);

  useEffect(() => {
    if (
      !googleCanView ||
      !googleConnection.connected ||
      month === loadedGoogleMonth
    )
      return;
    const controller = new AbortController();
    fetch(
      withAccessPreview(
        `/api/integrations/google-calendar/events?month=${encodeURIComponent(month)}`,
        data.accessPreview,
      ),
      { signal: controller.signal },
    )
      .then((response) => parseMutationResponse<{ events: GoogleCalendarEvent[] }>(response))
      .then((result) => {
        setGoogleEvents(result.events);
        setLoadedGoogleMonth(month);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadedGoogleMonth(month);
          toast.error(error instanceof Error ? error.message : "Google Calendar could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [
    data.accessPreview,
    googleCanView,
    googleConnection.connected,
    loadedGoogleMonth,
    month,
  ]);

  async function disconnectGoogle() {
    setDisconnectingGoogle(true);
    try {
      await mutate<{ disconnected: boolean }>(
        "/api/integrations/google-calendar/disconnect",
        { method: "POST", body: "{}" },
      );
      setGoogleConnection({ connected: false });
      setGoogleEvents([]);
      setGoogleSettingsOpen(false);
      toast.success("Google Calendar disconnected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google Calendar could not be disconnected.");
    } finally {
      setDisconnectingGoogle(false);
    }
  }

  return (
    <>
      <WorkspacePageShell
        data={data}
        setData={setData}
        demoMode={demoMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        contentClassName="p-3 sm:p-6 lg:p-6 xl:p-8"
      >
        <Modal
          open
          setIsOpen={() => undefined}
          title={<>Calendar <CountBadge size="lg" label="event">{monthItems.length}</CountBadge></>}
          description="Deadlines, important dates, meetings, and time away—one place to see what the team has coming up."
          embedded
          size="2xl"
          actions={
            previewing ? (
              <Tooltip content="Exit access preview to change the calendar">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" variant="secondary" className="w-full sm:w-auto" leftIcon={<FiUserX />} disabled>
                    Log time away
                  </Button>
                  <Button size="sm" className="w-full sm:w-auto" leftIcon={<FiPlus />} disabled>
                    Add date
                  </Button>
                </div>
              </Tooltip>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="sm" variant="secondary" className="w-full sm:w-auto" leftIcon={<FiUserX />} onClick={() => openNew("away")}>
                  Log time away
                </Button>
                <Button size="sm" className="w-full sm:w-auto" leftIcon={<FiPlus />} onClick={() => openNew("important")}>
                  Add date
                </Button>
              </div>
            )
          }
        >
          <div className={`grid gap-5 ${calendarSidebarOpen ? "xl:grid-cols-[minmax(0,1fr)_18rem]" : "grid-cols-1"}`}>
            <section className="min-w-0">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button size="xs" variant="secondary" aria-label="Previous month" onClick={() => setMonth(moveMonth(month, -1))}><FiArrowLeft /></Button>
                  <h2 className="min-w-44 text-center text-lg font-semibold">{monthFormatter.format(new Date(`${month}-01T00:00:00Z`))}</h2>
                  <Button size="xs" variant="secondary" aria-label="Next month" onClick={() => setMonth(moveMonth(month, 1))}><FiArrowRight /></Button>
                </div>
                <div className="flex flex-wrap items-end justify-end gap-2">
                  {(googleCanView || googleCanManage) && (
                    <button
                      type="button"
                      onClick={() => setGoogleSettingsOpen(true)}
                      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${googleConnection.connected ? "border-blue-500/30 bg-blue-500/10 text-blue-800 hover:bg-blue-500/15 focus-visible:ring-blue-500/30 dark:border-blue-400/30 dark:text-blue-200" : "border-black/15 bg-black/[0.035] text-black/65 hover:bg-black/[0.07] focus-visible:ring-black/30 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/65 dark:hover:bg-white/10 dark:focus-visible:ring-white/30"}`}
                      aria-label={`Google Calendar is ${googleConnection.connected ? "connected" : "not connected"}. Open connection settings.`}
                    >
                      <span className={`h-2 w-2 rounded-full ${googleConnection.connected ? "bg-emerald-500" : "bg-black/30 dark:bg-white/30"}`} aria-hidden />
                      <FiCalendar aria-hidden />
                      <span>Google · {googleLoading ? "Syncing" : googleConnection.connected ? "Connected" : "Not connected"}</span>
                    </button>
                  )}
                  <DropdownSelect className="h-9" label="Show" value={source} onChange={setSource} options={[
                    { label: "Everything", value: "all" },
                    { label: "Deadlines", value: "task" },
                    { label: "Time away", value: "away" },
                    { label: "Important dates", value: "important" },
                    ...(googleCanView && googleConnection.connected ? [{ label: "Google Calendar", value: "google" }] : []),
                  ]} />
                  <Button size="sm" variant="secondary" leftIcon={<FiCalendar />} onClick={() => setMonth(initialMonth)}>Today</Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<FiSidebar />}
                    aria-expanded={calendarSidebarOpen}
                    onClick={toggleCalendarSidebar}
                  >
                    {calendarSidebarOpen ? "Hide details" : "Show details"}
                  </Button>
                </div>
              </div>
              {googleSyncing && <SyncingBanner />}
              <div className="hidden overflow-hidden rounded-xl border border-black/10 dark:border-white/10 md:block" aria-busy={googleSyncing}>
                <div className="grid grid-cols-7 border-b border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
                  {weekdays.map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">{day}</div>)}
                </div>
                <div className={`grid grid-cols-7 transition-opacity ${googleSyncing ? "opacity-60" : ""}`}>
                  {days.map((date) => {
                    const dateItems = itemsOnDate(items, date);
                    const inMonth = Number(date.slice(5, 7)) === monthNumber;
                    return (
                      <div key={date} className={`min-h-28 border-b border-r border-black/10 p-1.5 last:border-r-0 dark:border-white/10 ${inMonth ? "bg-white/60 dark:bg-white/[0.015]" : "bg-black/[0.025] text-black/40 dark:bg-black/10 dark:text-white/35"}`}>
                        <button type="button" onClick={() => openNew("important", date)} aria-label={`Add an item on ${date}`} className={`mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/40 ${date === today ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}>{Number(date.slice(8))}</button>
                        <div className="space-y-1">{renderDayItems(date, dateItems)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3 md:hidden" aria-busy={googleSyncing}>
                {agendaDates.length ? agendaDates.map((date) => (
                  <div key={date} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                    <p className="pt-2 text-xs font-semibold text-black/60 dark:text-white/60">{dayFormatter.format(new Date(`${date}T00:00:00Z`))}</p>
                    <div className="space-y-2">{renderDayItems(date, itemsOnDate(monthItems, date), Number.POSITIVE_INFINITY)}</div>
                  </div>
                )) : googleSyncing ? <SyncingItems rows={3} /> : <EmptyState message="Nothing scheduled this month. A suspiciously peaceful calendar." />}
              </div>
            </section>
            {calendarSidebarOpen && <aside className="space-y-4" aria-label="Calendar details">
              <Card className="p-4">
                <h2 className="flex items-center gap-2 font-semibold"><FiClock /> Coming up{googleSyncing && <Spinner size={14} label="Syncing Google Calendar" className="text-blue-700 dark:text-blue-300" />}</h2>
                <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1" aria-busy={googleSyncing}>{upcomingDates.slice(0, 6).map((date) => <div key={`upcoming:${date}`} className="space-y-1"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/50 dark:text-white/50">{dayFormatter.format(new Date(`${date}T00:00:00Z`))}</p>{renderDayItems(date, itemsOnDate(monthItems, date), 2)}</div>)}{googleSyncing && <SyncingItems rows={upcomingDates.length ? 1 : 3} />}{!upcomingDates.length && !googleSyncing && <p className="text-sm text-black/60 dark:text-white/60">{monthItems.length ? "Nothing left this month. Check a later month for what is next." : "Nothing on the books this month."}</p>}</div>
              </Card>
              <Card className="p-4" aria-label="Calendar source key">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><FiInfo /> Calendar key</h2>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-black/70 dark:text-white/70">
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-fuchsia-600 dark:bg-fuchsia-400" />Deadlines</span>
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-blue-600 dark:bg-blue-400" />Google</span>
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-amber-600 dark:bg-amber-400" />Away</span>
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[linear-gradient(135deg,#059669_0_50%,#7c3aed_50%)]" />Dates</span>
                </div>
              </Card>
            </aside>}
          </div>
        </Modal>
      </WorkspacePageShell>

      <GoogleEventModal event={googleEvent} onClose={() => setGoogleEventId(null)} />

      <Modal
        open={googleSettingsOpen}
        setIsOpen={setGoogleSettingsOpen}
        title="Google Calendar"
        description="Manage the calendar connection without taking up space beside the schedule."
        size="sm"
      >
        <div className="rounded-xl border border-black/10 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-500/10 p-2 text-blue-700 dark:text-blue-300"><FiCalendar aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {googleConnection.connected && <FiCheck className="text-emerald-600 dark:text-emerald-300" aria-hidden />}
                {googleConnection.connected ? "Connected" : "Not connected"}
              </p>
              {googleConnection.email && <p className="mt-0.5 truncate text-xs text-black/60 dark:text-white/60">{googleConnection.email}</p>}
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-black/65 dark:text-white/65">
            {googleConnection.connected
              ? googleLoading
                ? "Refreshing events for this month. Nothing from Tasks is sent to Google."
                : "Google events are up to date for this month. Nothing from Tasks is sent to Google."
              : googleConfigured
                ? "Connect the shared workspace calendar to show its events here."
                : "Add the Google OAuth environment variables to enable this connection."}
          </p>
          {googleCanManage ? (
            googleConnection.connected ? (
              <Button className="mt-4 w-full" size="sm" variant="secondary" leftIcon={<FiX />} loading={disconnectingGoogle} onClick={disconnectGoogle}>Disconnect</Button>
            ) : (
              <Button.Link href="/api/integrations/google-calendar/connect" className="mt-4 w-full" size="sm" variant="secondary" leftIcon={<FiExternalLink />} disabled={!googleConfigured || demoMode}>Connect Google Calendar</Button.Link>
            )
          ) : (
            <p className="mt-3 text-xs text-black/50 dark:text-white/50">A workspace owner manages this connection.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(dayAgenda)}
        setIsOpen={(open) => { if (!open) setDayAgenda(null); }}
        title={dayAgenda ? dayFormatter.format(new Date(`${dayAgenda.date}T00:00:00Z`)) : "Day agenda"}
        description={dayAgenda ? `${dayAgenda.items.length} ${dayAgenda.items.length === 1 ? "item" : "items"} on the calendar. Time away stays at the top.` : undefined}
        size="lg"
      >
        <div className="space-y-2">
          {dayAgenda?.items.map((item) => (
            <Item
              key={`agenda:${item.id}`}
              item={item.source === "task" && item.href
                ? { ...item, href: withAccessPreview(item.href, data.accessPreview) }
                : item}
              onOpen={() => {
                setDayAgenda(null);
                openItem(item);
              }}
            />
          ))}
        </div>
      </Modal>

      <Modal
        open={Boolean(taskSummary)}
        setIsOpen={(open) => { if (!open) setTaskSummary(null); }}
        title={taskSummary ? `Tasks due ${dayFormatter.format(new Date(`${taskSummary.date}T00:00:00Z`))}` : "Tasks due"}
        description={taskSummary ? `${taskSummary.items.length} ${taskSummary.items.length === 1 ? "task is" : "tasks are"} due on this day, ordered by urgency.` : undefined}
        size="lg"
      >
        <div className="space-y-2">
          {taskSummary && [...taskSummary.items].sort(compareTaskItems).map((item) => {
            const task = item.task;
            const status = data.statuses.find((candidate) => candidate.id === task?.status_id);
            const assigneeIds = new Set([
              ...(task?.assignee_id ? [task.assignee_id] : []),
              ...data.taskAssignees
                .filter((assignment) => assignment.task_id === task?.id)
                .map((assignment) => assignment.profile_id),
            ]);
            const assignees = data.profiles.filter((profile) => assigneeIds.has(profile.id));
            const project = data.projects.find((candidate) => candidate.id === task?.project_id);
            const categoryIds = new Set(
              data.taskCategories
                .filter((assignment) => assignment.task_id === task?.id)
                .map((assignment) => assignment.category_id),
            );
            const categories = data.categories.filter((category) => categoryIds.has(category.id));
            const subtasks = data.subtasks.filter((subtask) => subtask.task_id === task?.id);
            const completedSubtasks = subtasks.filter((subtask) => subtask.is_completed).length;
            const href = withAccessPreview(item.href ?? "/board", data.accessPreview);
            return (
              <Link
                key={item.id}
                href={href}
                aria-label={`Open ${item.title}`}
                className="group block rounded-xl border border-black/10 bg-black/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-black/25 hover:bg-black/[0.04] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 motion-reduce:transform-none dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/30 dark:hover:bg-white/[0.07] dark:focus-visible:ring-white/40"
              >
                <div className="flex items-start justify-between gap-3">
                  {task && <TaskKeyBadge task={task} />}
                  <span className="flex shrink-0 items-center gap-2">
                    {task && <TaskPriorityBadge priority={task.priority} size="compact" />}
                    <FiExternalLink aria-hidden className="text-black/35 transition group-hover:text-black/70 dark:text-white/35 dark:group-hover:text-white/75" />
                  </span>
                </div>
                <h3 className="mt-3 font-semibold leading-snug">{item.title}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-black/60 dark:text-white/60">
                  {status && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-black/75 dark:text-white/75">
                      <i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                      {status.name}
                    </span>
                  )}
                  {project && (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <FiFolder className="shrink-0" aria-hidden />
                      <span className="truncate">{project.name}</span>
                    </span>
                  )}
                  {task?.due_time && (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <FiClock className="shrink-0" aria-hidden />
                      <time dateTime={task.due_time}>{displayTime(task.due_time)} {workspaceTimeZoneLabel(task.due_date ?? taskSummary.date)}</time>
                    </span>
                  )}
                  {assignees.length > 0 ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span className="flex shrink-0 -space-x-1.5">
                        {assignees.slice(0, 3).map((person) => (
                          <Avatar key={person.id} name={profileDisplayName(person)} src={person.avatar_url} size="sm" />
                        ))}
                      </span>
                      <span className="truncate">{assignees.map((person) => profileDisplayName(person)).join(", ")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <FiUsers aria-hidden />
                      Unassigned
                    </span>
                  )}
                  {subtasks.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-black/55 dark:text-white/55">
                      <span aria-hidden>✓</span>
                      {completedSubtasks}/{subtasks.length}
                      <span className="sr-only">checklist items complete</span>
                    </span>
                  )}
                </div>
                {task && categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {categories.slice(0, 3).map((category) => (
                      <TaskCategoryBadge key={category.id} category={category} tags={task.category_tags?.[category.id]} />
                    ))}
                    {categories.length > 3 && <Pill size="sm">+{categories.length - 3}</Pill>}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={Boolean(draft)}
        setIsOpen={(open) => { if (!open && !saving) setDraft(null); }}
        title={draft?.id ? `Edit ${draft.kind === "away" ? "time away" : "important date"}` : draft?.kind === "away" ? "Log time away" : "Add important date"}
        description={draft?.kind === "away" ? "Let the team know when you will be unreachable." : "Add a milestone, event, or important date that is not a task deadline."}
        formId="calendar-event-form"
        onSubmit={saveEvent}
        closable={!saving}
        footer={draft && <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><div>{draft.id && canEdit && <Button variant="danger" size="sm" leftIcon={<FiTrash2 />} loading={deleting} onClick={deleteEvent}>Delete</Button>}</div><div className="flex flex-col-reverse gap-3 sm:flex-row"><Button variant="secondary" size="sm" disabled={saving} onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" size="sm" loading={saving} disabled={!canEdit || !draft.title.trim() || draft.endDate < draft.startDate || Boolean(recurrenceConflict) || (draft.kind === "away" && !draft.profileId)}>Save</Button></div></div>}
      >
        {draft && <div className="space-y-5">
          {!canEdit && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{previewing ? "Access preview is read-only. Exit the preview to change calendar items." : <>This was logged by {profileDisplayName(profiles.get(editingEvent?.created_by ?? ""))}. Only that teammate, the person who is away, or an app owner can change it.</>}</div>}
          {draft.kind === "away" && (canEdit ? <DropdownSelect variant="field" required label="Who will be away?" proximityValue={data.currentProfile.id} value={draft.profileId} onChange={(value) => updateDraft("profileId", value)} options={data.profiles.filter((profile) => profile.onboarding_completed).map((profile) => ({ avatar: { name: profileDisplayName(profile), src: profile.avatar_url }, label: profileDisplayName(profile), value: profile.id }))} /> : <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60 dark:text-white/60">Who will be away?</p><p className="mt-2 flex items-center gap-2 text-sm"><Avatar name={profileDisplayName(profiles.get(draft.profileId))} src={profiles.get(draft.profileId)?.avatar_url} size="sm" />{profileDisplayName(profiles.get(draft.profileId))}</p></div>)}
          <Input label="Title" name="calendar-title" required value={draft.title} disabled={!canEdit || saving} placeholder={draft.kind === "away" ? "Out of office" : "What is happening?"} onChange={(event) => updateDraft("title", event.target.value)} />
          <Textarea id="calendar-description" label="Details" name="calendar-description" value={draft.description} disabled={!canEdit || saving} rows={3} placeholder="Add the context your teammates will need." onChange={(event) => updateDraft("description", event.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2"><Input type="date" label="Start date" name="calendar-start-date" required value={draft.startDate} disabled={!canEdit || saving} onChange={(event) => updateDraft("startDate", event.target.value)} /><Input type="date" label="End date" name="calendar-end-date" required min={draft.startDate} value={draft.endDate} disabled={!canEdit || saving} onChange={(event) => updateDraft("endDate", event.target.value)} /></div>
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.allDay} disabled={!canEdit || saving} onChange={(event) => updateDraft("allDay", event.target.checked)} className="h-4 w-4 rounded border-black/30 accent-black dark:border-white/30 dark:accent-white" />All day</label>
          {!draft.allDay && <div className="space-y-2"><div className="grid gap-4 sm:grid-cols-2"><Input type="time" label="Start time" name="calendar-start-time" required value={draft.startTime} disabled={!canEdit || saving} onChange={(event) => updateDraft("startTime", event.target.value)} /><Input type="time" label="End time" name="calendar-end-time" required value={draft.endTime} disabled={!canEdit || saving} onChange={(event) => updateDraft("endTime", event.target.value)} /></div><p className="text-xs text-black/55 dark:text-white/55">Saved in {workspaceTimeZoneLabel(draft.startDate, "long")}, and shown that way to every teammate.</p></div>}
          <CalendarRecurrenceFields key={draft.id ?? "new"} startDate={draft.startDate} endDate={draft.endDate} value={draft.recurrence} disabled={!canEdit || saving} onChange={(recurrence) => updateDraft("recurrence", recurrence)} />
          {Boolean(draft.id) && Boolean(draft.recurrence) && <p className="text-xs text-black/60 dark:text-white/60">Every date in this series shares one entry, so an edit here changes all of them.</p>}
          {draft.kind === "important" && <DropdownSelect variant="field" label="Visibility" value={draft.projectId ? `project:${draft.projectId}` : draft.categoryId ? `category:${draft.categoryId}` : "workspace"} onChange={(value) => { const [kind, id] = value.split(":"); updateDraft("projectId", kind === "project" ? id : ""); updateDraft("categoryId", kind === "category" ? id : ""); }} options={[{ label: "Everyone in the workspace", value: "workspace" }, ...data.projects.filter((project) => !project.archived_at).map((project) => ({ label: project.name, value: `project:${project.id}`, group: { label: "Projects" } })), ...data.categories.filter((category) => !category.archived_at).map((category) => ({ label: category.name, value: `category:${category.id}`, color: category.color, group: { label: "Categories" } }))]} />}
          {googleSyncAvailable && (
            <label className="flex items-start gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={draft.syncToGoogle}
                disabled={!canEdit || saving}
                onChange={(event) => updateDraft("syncToGoogle", event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-black/30 accent-black dark:border-white/30 dark:accent-white"
              />
              <span>
                Add to the workspace Google Calendar
                <span className="mt-1 block text-xs font-normal text-black/70 dark:text-white/70">
                  {googleConnection.email
                    ? `Saves a copy on ${googleConnection.email}, visible to everyone who can see the shared calendar.`
                    : "Saves a copy on the shared calendar, visible to everyone who can see it."}
                </span>
              </span>
            </label>
          )}
        </div>}
      </Modal>
    </>
  );
}
