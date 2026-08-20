"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  DropdownSelect,
  EmptyState,
  Input,
  Modal,
  Pill,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiExternalLink,
  FiPlus,
  FiTrash2,
  FiUserX,
} from "react-icons/fi";
import { WorkspacePageShell } from "@/components/global";
import {
  blankCalendarDraft,
} from "@/lib/api-schema/calendar";
import {
  calendarItems,
  itemsOnDate,
  monthBounds,
  type CalendarEvent,
  type CalendarEventDraft,
  type CalendarEventKind,
  type CalendarItem,
} from "@/lib/calendar-types";
import { mutate } from "@/lib/mutation-client";
import { profileDisplayName } from "@/lib/presentation";
import type { WorkspaceData } from "@/lib/workspace-types";

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

function moveMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return next.toISOString().slice(0, 7);
}

function eventDraft(event: CalendarEvent): CalendarEventDraft {
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
    projectId: event.project_id ?? "",
    categoryId: event.category_id ?? "",
    profileId: event.profile_id ?? "",
  };
}

function Item({ item, onEdit }: { item: CalendarItem; onEdit: () => void }) {
  const className =
    "block min-w-0 rounded-md border-l-4 bg-black/[0.035] px-2 py-1 text-left text-[11px] leading-tight transition hover:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:bg-white/[0.06] dark:hover:bg-white/10 dark:focus-visible:ring-white/40";
  const content = (
    <>
      <span className="block truncate font-semibold">{item.title}</span>
      <span className="block truncate text-[10px] text-black/55 dark:text-white/55">
        {item.meta}
      </span>
    </>
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
      onClick={onEdit}
    >
      {content}
    </button>
  );
}

export function CalendarPageClient({
  initialData,
  initialEvents,
  initialMonth,
  demoMode,
}: {
  initialData: WorkspaceData;
  initialEvents: CalendarEvent[];
  initialMonth: string;
  demoMode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [events, setEvents] = useState(initialEvents);
  const [month, setMonth] = useState(initialMonth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState<CalendarEventDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [source, setSource] = useState("all");
  const { days, monthNumber } = monthBounds(month);
  const today = initialMonth === new Date().toISOString().slice(0, 7)
    ? new Date().toISOString().slice(0, 10)
    : "";
  const allItems = useMemo(
    () => calendarItems(data.tasks, events, data.projects, data.categories, data.profiles),
    [data.categories, data.profiles, data.projects, data.tasks, events],
  );
  const items = source === "all"
    ? allItems
    : allItems.filter((item) => item.source === source);
  const monthStart = `${month}-01`;
  const monthEnd = `${moveMonth(month, 1)}-01`;
  const monthItems = items.filter(
    (item) => item.start < monthEnd && item.end >= monthStart,
  );
  const profiles = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const updateDraft = <K extends keyof CalendarEventDraft>(
    key: K,
    value: CalendarEventDraft[K],
  ) => setDraft((current) => current ? { ...current, [key]: value } : current);

  function openNew(kind: CalendarEventKind, date = today || `${month}-01`) {
    setDraft({
      ...blankCalendarDraft(kind, date),
      profileId: kind === "away" ? data.currentProfile.id : "",
    });
  }

  function openItem(item: CalendarItem) {
    if (item.event) setDraft(eventDraft(item.event));
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      let saved: CalendarEvent;
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
          project_id: draft.kind === "important" ? draft.projectId || null : null,
          category_id: draft.kind === "important" ? draft.categoryId || null : null,
          profile_id: draft.kind === "away" ? draft.profileId : null,
          created_by: data.currentProfile.id,
          created_at: events.find((item) => item.id === draft.id)?.created_at ?? now,
          updated_at: now,
        };
      } else {
        saved = (
          await mutate<{ event: CalendarEvent }>("/api/calendar-events", {
            method: draft.id ? "PATCH" : "POST",
            body: JSON.stringify(draft),
          })
        ).event;
      }
      setEvents((current) => current.some((item) => item.id === saved.id)
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved]);
      setDraft(null);
      toast.success(draft.id ? "Calendar item updated." : "Calendar item added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The calendar item could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!draft?.id) return;
    setDeleting(true);
    try {
      if (!demoMode)
        await mutate("/api/calendar-events", {
          method: "DELETE",
          body: JSON.stringify({ id: draft.id }),
        });
      setEvents((current) => current.filter((item) => item.id !== draft.id));
      setDraft(null);
      toast.success("Calendar item deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The calendar item could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  const editingEvent = draft?.id ? events.find((event) => event.id === draft.id) : null;
  const canEdit =
    !editingEvent ||
    editingEvent.created_by === data.currentProfile.id ||
    editingEvent.profile_id === data.currentProfile.id ||
    data.currentProfile.app_role === "owner";

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
          title="Calendar"
          description="Deadlines, important dates, meetings, and time away—one place to see what the Ryans have coming up."
          embedded
          size="2xl"
          actions={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="sm" variant="secondary" className="w-full sm:w-auto" leftIcon={<FiUserX />} onClick={() => openNew("away")}>
                Log time away
              </Button>
              <Button size="sm" className="w-full sm:w-auto" leftIcon={<FiPlus />} onClick={() => openNew("important")}>
                Add date
              </Button>
            </div>
          }
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="min-w-0">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button size="xs" variant="secondary" aria-label="Previous month" onClick={() => setMonth(moveMonth(month, -1))}><FiArrowLeft /></Button>
                  <h2 className="min-w-44 text-center text-lg font-semibold">{monthFormatter.format(new Date(`${month}-01T00:00:00Z`))}</h2>
                  <Button size="xs" variant="secondary" aria-label="Next month" onClick={() => setMonth(moveMonth(month, 1))}><FiArrowRight /></Button>
                </div>
                <div className="flex items-end gap-2">
                  <DropdownSelect label="Show" value={source} onChange={setSource} options={[
                    { label: "Everything", value: "all" },
                    { label: "Deadlines", value: "task" },
                    { label: "Time away", value: "away" },
                    { label: "Important dates", value: "important" },
                  ]} />
                  <Button size="sm" variant="secondary" leftIcon={<FiCalendar />} onClick={() => setMonth(initialMonth)}>Today</Button>
                </div>
              </div>
              <div className="hidden overflow-hidden rounded-xl border border-black/10 dark:border-white/10 md:block">
                <div className="grid grid-cols-7 border-b border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
                  {weekdays.map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">{day}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((date) => {
                    const dateItems = itemsOnDate(items, date);
                    const inMonth = Number(date.slice(5, 7)) === monthNumber;
                    return (
                      <div key={date} className={`min-h-28 border-b border-r border-black/10 p-1.5 last:border-r-0 dark:border-white/10 ${inMonth ? "bg-white/60 dark:bg-white/[0.015]" : "bg-black/[0.025] text-black/40 dark:bg-black/10 dark:text-white/35"}`}>
                        <button type="button" onClick={() => openNew("important", date)} aria-label={`Add an item on ${date}`} className={`mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/40 ${date === today ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}>{Number(date.slice(8))}</button>
                        <div className="space-y-1">{dateItems.slice(0, 3).map((item) => <Item key={item.id} item={item} onEdit={() => openItem(item)} />)}{dateItems.length > 3 && <p className="px-1 text-[10px] text-black/55 dark:text-white/55">+{dateItems.length - 3} more</p>}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3 md:hidden">
                {monthItems.length ? monthItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                    <p className="pt-2 text-xs font-semibold text-black/60 dark:text-white/60">{dayFormatter.format(new Date(`${item.start}T00:00:00Z`))}</p>
                    <Item item={item} onEdit={() => openItem(item)} />
                  </div>
                )) : <EmptyState message="Nothing scheduled this month. A suspiciously peaceful calendar." />}
              </div>
            </section>
            <aside className="space-y-4">
              <Card className="p-4">
                <div className="flex items-start gap-3"><span className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-300"><FiCalendar /></span><div><h2 className="font-semibold">Google Calendar</h2><p className="mt-1 text-sm leading-relaxed text-black/65 dark:text-white/65">Bring meetings into this view and publish accessible Ryan dates back to Google Calendar.</p></div></div>
                <Button className="mt-4 w-full" size="sm" variant="secondary" leftIcon={<FiExternalLink />} disabled>Connect Google Calendar</Button>
                <p className="mt-2 text-xs text-black/50 dark:text-white/50">Connection setup is the next integration step. No Google data is shared yet.</p>
              </Card>
              <Card className="p-4">
                <h2 className="flex items-center gap-2 font-semibold"><FiClock /> Coming up</h2>
                <div className="mt-3 space-y-2">{monthItems.slice(0, 6).map((item) => <Item key={`upcoming:${item.id}`} item={item} onEdit={() => openItem(item)} />)}{!monthItems.length && <p className="text-sm text-black/60 dark:text-white/60">Nothing on the books this month.</p>}</div>
              </Card>
              <div className="flex flex-wrap gap-2" aria-label="Calendar legend">
                <Pill size="sm">Blue · deadlines</Pill><Pill size="sm">Amber · away</Pill><Pill size="sm">Green · important</Pill>
              </div>
            </aside>
          </div>
        </Modal>
      </WorkspacePageShell>

      <Modal
        open={Boolean(draft)}
        setIsOpen={(open) => { if (!open && !saving) setDraft(null); }}
        title={draft?.id ? `Edit ${draft.kind === "away" ? "time away" : "important date"}` : draft?.kind === "away" ? "Log time away" : "Add important date"}
        description={draft?.kind === "away" ? "Let the team know when you will be unreachable." : "Add a milestone, event, or important date that is not a task deadline."}
        formId="calendar-event-form"
        onSubmit={saveEvent}
        closable={!saving}
        footer={draft && <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><div>{draft.id && canEdit && <Button variant="danger" size="sm" leftIcon={<FiTrash2 />} loading={deleting} onClick={deleteEvent}>Delete</Button>}</div><div className="flex flex-col-reverse gap-3 sm:flex-row"><Button variant="secondary" size="sm" disabled={saving} onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" size="sm" loading={saving} disabled={!canEdit || !draft.title.trim() || draft.endDate < draft.startDate || (draft.kind === "away" && !draft.profileId)}>Save</Button></div></div>}
      >
        {draft && <div className="space-y-5">
          {!canEdit && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">This was logged by {profileDisplayName(profiles.get(editingEvent?.created_by ?? ""))}. Only that Ryan, the teammate who is away, or an app owner can change it.</div>}
          {draft.kind === "away" && (canEdit ? <DropdownSelect variant="field" required label="Who will be away?" value={draft.profileId} onChange={(value) => updateDraft("profileId", value)} options={data.profiles.filter((profile) => profile.onboarding_completed).map((profile) => ({ label: profileDisplayName(profile), value: profile.id }))} /> : <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60 dark:text-white/60">Who will be away?</p><p className="mt-2 text-sm">{profileDisplayName(profiles.get(draft.profileId))}</p></div>)}
          <Input label="Title" name="calendar-title" required value={draft.title} disabled={!canEdit || saving} placeholder={draft.kind === "away" ? "Out of office" : "What is happening?"} onChange={(event) => updateDraft("title", event.target.value)} />
          <Textarea id="calendar-description" label="Details" name="calendar-description" value={draft.description} disabled={!canEdit || saving} rows={3} placeholder="Add the context other Ryans will need." onChange={(event) => updateDraft("description", event.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2"><Input type="date" label="Start date" name="calendar-start-date" required value={draft.startDate} disabled={!canEdit || saving} onChange={(event) => updateDraft("startDate", event.target.value)} /><Input type="date" label="End date" name="calendar-end-date" required min={draft.startDate} value={draft.endDate} disabled={!canEdit || saving} onChange={(event) => updateDraft("endDate", event.target.value)} /></div>
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.allDay} disabled={!canEdit || saving} onChange={(event) => updateDraft("allDay", event.target.checked)} className="h-4 w-4 rounded border-black/30 accent-black dark:border-white/30 dark:accent-white" />All day</label>
          {!draft.allDay && <div className="grid gap-4 sm:grid-cols-2"><Input type="time" label="Start time" name="calendar-start-time" required value={draft.startTime} disabled={!canEdit || saving} onChange={(event) => updateDraft("startTime", event.target.value)} /><Input type="time" label="End time" name="calendar-end-time" required value={draft.endTime} disabled={!canEdit || saving} onChange={(event) => updateDraft("endTime", event.target.value)} /></div>}
          {draft.kind === "important" && <DropdownSelect variant="field" label="Visibility" value={draft.projectId ? `project:${draft.projectId}` : draft.categoryId ? `category:${draft.categoryId}` : "workspace"} onChange={(value) => { const [kind, id] = value.split(":"); updateDraft("projectId", kind === "project" ? id : ""); updateDraft("categoryId", kind === "category" ? id : ""); }} options={[{ label: "Everyone in the workspace", value: "workspace" }, ...data.projects.filter((project) => !project.archived_at).map((project) => ({ label: `Project · ${project.name}`, value: `project:${project.id}`, group: { label: "Projects" } })), ...data.categories.filter((category) => !category.archived_at).map((category) => ({ label: `Category · ${category.name}`, value: `category:${category.id}`, color: category.color, group: { label: "Categories" } }))]} />}
        </div>}
      </Modal>
    </>
  );
}
