import { profileDisplayName } from "@/lib/presentation";
import {
  parseTaskChanges,
  type TaskChange,
  type TaskChangeField,
} from "./task-change-summary";
import type { TaskActivity } from "./activity-types";
import type { Category, Project } from "@/lib/resources/resource-types";
import type { Status } from "@/lib/tasks/task-types";
import type { Profile } from "@/lib/workspace/workspace-types";
import { formatCalendarDate, formatTimestamp } from "../date-format";

export type TaskChangeLookups = {
  statuses: Pick<Status, "id" | "name" | "color">[];
  projects: Pick<Project, "id" | "name">[];
  profiles: Profile[];
  categories: Pick<Category, "id" | "name" | "color">[];
};

export type TaskChangeDetail = {
  field: TaskChangeField;
  /** Readable previous value; absent when the field was empty or unresolved. */
  from?: string;
  /** Readable next value; absent when the field was cleared or unresolved. */
  to?: string;
  /**
   * Whether a next value was actually recorded. Separates a cleared field from
   * one pointing at a project, person, or status that no longer exists.
   */
  hasNext: boolean;
  added?: string[];
  removed?: string[];
};

// An activity row records whatever value the field held, so a malformed date
// is possible. Showing the raw value beats showing "Invalid Date".
function formatDate(value: string) {
  return Number.isNaN(new Date(`${value}T12:00:00Z`).getTime())
    ? value
    : formatCalendarDate(value);
}

function formatDateTime(value: string) {
  return Number.isNaN(new Date(value).getTime())
    ? value
    : formatTimestamp(value);
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 || 12}:${minutes ?? "00"} ${suffix}`;
}

function formatValue(
  field: TaskChangeField,
  value: string | null | undefined,
  lookups: TaskChangeLookups,
) {
  if (!value) return undefined;
  if (field === "status")
    return lookups.statuses.find((status) => status.id === value)?.name;
  if (field === "project")
    return lookups.projects.find((project) => project.id === value)?.name;
  if (field === "assignee" || field === "reported_by") {
    const profile = lookups.profiles.find((entry) => entry.id === value);
    return profile ? profileDisplayName(profile) : undefined;
  }
  if (field === "priority")
    return value.charAt(0).toUpperCase() + value.slice(1);
  if (field === "start_date" || field === "due_date") return formatDate(value);
  if (field === "due_time") return formatTime(value);
  if (field === "reminder_at") return formatDateTime(value);
  return value;
}

function formatMembers(
  field: TaskChangeField,
  values: string[] | undefined,
  lookups: TaskChangeLookups,
) {
  if (!values?.length) return undefined;
  if (field !== "categories") return values;
  return values.map(
    (value) =>
      lookups.categories.find((category) => category.id === value)?.name ??
      value,
  );
}

/** Resolve a stored task diff into the values a reader recognizes. */
export function describeTaskChanges(
  changes: TaskChange[],
  lookups: TaskChangeLookups,
): TaskChangeDetail[] {
  return changes.map((change) => ({
    field: change.field,
    from: formatValue(change.field, change.from, lookups),
    to: formatValue(change.field, change.to, lookups),
    hasNext: Boolean(change.to),
    added: formatMembers(change.field, change.added, lookups),
    removed: formatMembers(change.field, change.removed, lookups),
  }));
}

export function taskActivityChanges(
  item: TaskActivity,
  lookups: TaskChangeLookups,
): TaskChangeDetail[] {
  return describeTaskChanges(parseTaskChanges(item.details.changes), lookups);
}

function list(values: string[]) {
  if (values.length < 3) return values.join(" and ");
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function capitalize(sentence: string) {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** A required field always has a next value, so it is never "cleared". */
function requiredSentence(noun: string, detail: TaskChangeDetail) {
  if (detail.from && detail.to)
    return `Changed ${noun} from ${detail.from} to ${detail.to}`;
  if (detail.to) return `Set ${noun} to ${detail.to}`;
  return `Changed ${noun}`;
}

function scheduleSentence(noun: string, detail: TaskChangeDetail) {
  if (detail.from && detail.to)
    return `Moved the ${noun} from ${detail.from} to ${detail.to}`;
  if (detail.to) return `Set the ${noun} to ${detail.to}`;
  if (detail.hasNext) return `Changed the ${noun}`;
  return `Cleared the ${noun}`;
}

function membershipSentence(
  singular: string,
  plural: string,
  detail: TaskChangeDetail,
) {
  const phrase = (verb: string, values: string[]) =>
    `${verb} the ${list(values)} ${values.length === 1 ? singular : plural}`;
  const parts = [
    detail.added?.length ? phrase("added", detail.added) : null,
    detail.removed?.length ? phrase("removed", detail.removed) : null,
  ].filter(Boolean);
  return capitalize(parts.join(" and "));
}

/** One plain-English sentence describing a single field change. */
export function taskChangeSentence(detail: TaskChangeDetail): string {
  switch (detail.field) {
    case "title":
      return detail.to ? `Renamed to “${detail.to}”` : "Changed the title";
    case "status":
      return requiredSentence("status", detail);
    case "priority":
      return requiredSentence("priority", detail);
    case "reported_by":
      return requiredSentence("the reporter", detail);
    case "assignee":
      if (detail.from && detail.to)
        return `Reassigned from ${detail.from} to ${detail.to}`;
      if (detail.to) return `Assigned to ${detail.to}`;
      if (detail.hasNext) return "Changed the assignee";
      return detail.from ? `Unassigned ${detail.from}` : "Removed the assignee";
    case "project":
      if (detail.from && detail.to)
        return `Moved from ${detail.from} to ${detail.to}`;
      if (detail.to) return `Added to ${detail.to}`;
      if (detail.hasNext) return "Changed the project";
      return detail.from
        ? `Removed from ${detail.from}`
        : "Removed the project";
    case "start_date":
      return scheduleSentence("start date", detail);
    case "due_date":
      return scheduleSentence("due date", detail);
    case "due_time":
      return scheduleSentence("due time", detail);
    case "reminder_at":
      if (detail.from && detail.to)
        return `Moved the reminder from ${detail.from} to ${detail.to}`;
      if (detail.to) return `Set a reminder for ${detail.to}`;
      if (detail.hasNext) return "Changed the reminder";
      return "Cleared the reminder";
    case "description":
      return "Edited the description";
    case "categories":
      return membershipSentence("category", "categories", detail);
    case "tags":
      return membershipSentence("tag", "tags", detail);
  }
}
