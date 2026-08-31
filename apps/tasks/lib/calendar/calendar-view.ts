import { parseRecurrence } from "./calendar-recurrence";
import { workspaceGoogleEventId } from "./google-calendar-sync";
import type {
  CalendarEvent,
  CalendarEventDraft,
  CalendarItem,
} from "./calendar-types";
import { compareCalendarItems } from "./calendar-types";
import type { GoogleCalendarEvent } from "./google-calendar-types";

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

export function compareTaskItems(left: CalendarItem, right: CalendarItem) {
  const priorityDifference =
    priorityOrder[left.task?.priority ?? "low"] -
    priorityOrder[right.task?.priority ?? "low"];
  if (priorityDifference) return priorityDifference;
  const leftTime = left.task?.due_time ?? "99:99";
  const rightTime = right.task?.due_time ?? "99:99";
  return (
    leftTime.localeCompare(rightTime) || left.title.localeCompare(right.title)
  );
}

export function moveCalendarMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return next.toISOString().slice(0, 7);
}

export function calendarEventDraft(
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

/** Reconciles the locally known Google copy after saving a workspace event. */
export function rememberPublishedEvent(
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

export type CalendarDayLayout = {
  orderedItems: CalendarItem[];
  awayItems: CalendarItem[];
  taskItems: CalendarItem[];
  otherItems: CalendarItem[];
  hiddenCount: number;
};

/** Allocates the limited slots in a month cell without coupling the rule to JSX. */
export function calendarDayLayout(
  dateItems: CalendarItem[],
  limit = 3,
): CalendarDayLayout {
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
  const visibleTaskItems =
    taskItems.length > 0 && slotsLeft > 0 ? taskItems : [];
  if (visibleTaskItems.length) slotsLeft -= 1;
  const visibleOtherItems = otherItems.slice(0, slotsLeft);
  const visibleItemCount =
    visibleAwayItems.length +
    visibleTaskItems.length +
    visibleOtherItems.length;

  return {
    orderedItems,
    awayItems: visibleAwayItems,
    taskItems: visibleTaskItems,
    otherItems: visibleOtherItems,
    hiddenCount: Math.max(0, orderedItems.length - visibleItemCount),
  };
}
