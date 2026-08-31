import {
  objectWithKeys,
  optionalTrimmedText,
  parseUuid,
  requiredTrimmedText,
} from "./shared";
import type {
  CalendarEventDraft,
  CalendarEventKind,
} from "@/lib/calendar/calendar-types";
import {
  parseRecurrence,
  recurrenceSpanConflict,
} from "@/lib/calendar/calendar-recurrence";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

export function calendarEventSchema(value: unknown, requireId = false) {
  const body = objectWithKeys(value, [
    "id",
    "kind",
    "title",
    "description",
    "startDate",
    "endDate",
    "allDay",
    "startTime",
    "endTime",
    "recurrence",
    "projectId",
    "categoryId",
    "profileId",
    "syncToGoogle",
  ]);
  if (!body) return null;
  const id = requireId ? parseUuid(body.id) : undefined;
  const kind =
    body.kind === "important" || body.kind === "away"
      ? (body.kind as CalendarEventKind)
      : null;
  const title = requiredTrimmedText(body.title, 160);
  const description = optionalTrimmedText(body.description, 2000);
  const startDate =
    typeof body.startDate === "string" && datePattern.test(body.startDate)
      ? body.startDate
      : null;
  const endDate =
    typeof body.endDate === "string" && datePattern.test(body.endDate)
      ? body.endDate
      : null;
  const allDay = body.allDay;
  const startTime =
    typeof body.startTime === "string" && timePattern.test(body.startTime)
      ? body.startTime
      : null;
  const endTime =
    typeof body.endTime === "string" && timePattern.test(body.endTime)
      ? body.endTime
      : null;
  // An absent rule and an unreadable one are different answers: the first is a
  // date that happens once, the second is a request that must not be saved.
  const recurrence =
    body.recurrence === null || body.recurrence === undefined
      ? null
      : parseRecurrence(body.recurrence);
  const projectId = body.projectId ? parseUuid(body.projectId) : null;
  const categoryId = body.categoryId ? parseUuid(body.categoryId) : null;
  const profileId = body.profileId ? parseUuid(body.profileId) : null;
  const syncToGoogle = body.syncToGoogle ?? false;
  if (
    (requireId && !id) ||
    !kind ||
    !title ||
    description === null ||
    !startDate ||
    !endDate ||
    endDate < startDate ||
    typeof allDay !== "boolean" ||
    typeof syncToGoogle !== "boolean" ||
    (Boolean(body.recurrence) && !recurrence) ||
    (recurrence?.ends.type === "on" && recurrence.ends.date < startDate) ||
    Boolean(recurrenceSpanConflict(startDate, endDate, recurrence)) ||
    (!allDay && (!startTime || !endTime)) ||
    (body.projectId && !projectId) ||
    (body.categoryId && !categoryId) ||
    (body.profileId && !profileId) ||
    (projectId && categoryId) ||
    (kind === "away" && (!profileId || projectId || categoryId)) ||
    (kind === "important" && profileId)
  )
    return null;
  return {
    id,
    kind,
    title,
    description: description || null,
    startDate,
    endDate,
    allDay,
    startTime: allDay ? null : startTime,
    endTime: allDay ? null : endTime,
    recurrence,
    projectId,
    categoryId,
    profileId,
    syncToGoogle,
  };
}

export function calendarEventDeleteSchema(value: unknown) {
  const body = objectWithKeys(value, ["id"]);
  const id = body && parseUuid(body.id);
  return id ? { id } : null;
}

export function calendarEventValues(
  input: NonNullable<ReturnType<typeof calendarEventSchema>>,
) {
  const startsAt = `${input.startDate}T${input.startTime ?? "00:00"}:00`;
  const endsAt = `${input.endDate}T${input.endTime ?? "23:59"}:00`;
  return {
    kind: input.kind,
    title: input.title,
    description: input.description,
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: input.allDay,
    recurrence: input.recurrence,
    project_id: input.projectId,
    category_id: input.categoryId,
    profile_id: input.kind === "away" ? input.profileId : null,
  };
}

export function blankCalendarDraft(
  kind: CalendarEventKind,
  date: string,
): CalendarEventDraft {
  return {
    kind,
    title: kind === "away" ? "Out of office" : "",
    description: "",
    startDate: date,
    endDate: date,
    allDay: true,
    startTime: "09:00",
    endTime: "17:00",
    recurrence: null,
    projectId: "",
    categoryId: "",
    profileId: "",
    syncToGoogle: false,
  };
}
