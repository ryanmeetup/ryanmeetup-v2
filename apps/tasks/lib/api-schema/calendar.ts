import { objectWithKeys, optionalText, text, uuid } from "./shared";
import type { CalendarEventDraft, CalendarEventKind } from "../calendar-types";

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
    "projectId",
    "categoryId",
    "profileId",
  ]);
  if (!body) return null;
  const id = requireId ? uuid(body.id) : undefined;
  const kind =
    body.kind === "important" || body.kind === "away"
      ? (body.kind as CalendarEventKind)
      : null;
  const title = text(body.title, 160);
  const description = optionalText(body.description, 2000);
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
  const projectId = body.projectId ? uuid(body.projectId) : null;
  const categoryId = body.categoryId ? uuid(body.categoryId) : null;
  const profileId = body.profileId ? uuid(body.profileId) : null;
  if (
    (requireId && !id) ||
    !kind ||
    !title ||
    description === null ||
    !startDate ||
    !endDate ||
    endDate < startDate ||
    typeof allDay !== "boolean" ||
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
    projectId,
    categoryId,
    profileId,
  };
}

export function calendarEventDeleteSchema(value: unknown) {
  const body = objectWithKeys(value, ["id"]);
  const id = body && uuid(body.id);
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
    project_id: input.projectId,
    category_id: input.categoryId,
    profile_id: input.kind === "away" ? input.profileId : null,
  };
}

export function blankCalendarDraft(kind: CalendarEventKind, date: string): CalendarEventDraft {
  return {
    kind,
    title: kind === "away" ? "Out of office" : "",
    description: "",
    startDate: date,
    endDate: date,
    allDay: true,
    startTime: "09:00",
    endTime: "17:00",
    projectId: "",
    categoryId: "",
    profileId: "",
  };
}
