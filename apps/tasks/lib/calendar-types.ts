import type { Category, Project } from "./resource-types";
import type { Task } from "./task-types";
import type { Profile } from "./workspace-types";

export type CalendarEventKind = "important" | "away";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  project_id: string | null;
  category_id: string | null;
  profile_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export const CALENDAR_EVENT_COLUMNS =
  "id,kind,title,description,starts_at,ends_at,all_day,project_id,category_id,profile_id,created_by,created_at,updated_at";

export type CalendarEventDraft = {
  id?: string;
  kind: CalendarEventKind;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  projectId: string;
  categoryId: string;
  profileId: string;
};

export type CalendarItem = {
  id: string;
  source: "task" | CalendarEventKind | "google";
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  href?: string;
  task?: Task;
  event?: CalendarEvent;
  meta?: string;
};

const datePart = (value: string) => value.slice(0, 10);

export function calendarItems(
  tasks: Task[],
  events: CalendarEvent[],
  projects: Project[],
  categories: Category[],
  profiles: Profile[] = [],
): CalendarItem[] {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const taskItems: CalendarItem[] = tasks.flatMap((task) => {
    if (!task.due_date || task.archived_at || task.completed_at) return [];
    const project = task.project_id
      ? projectMap.get(task.project_id)
      : undefined;
    return [
      {
        id: `task:${task.id}`,
        source: "task",
        title: task.title,
        start: task.due_date,
        end: task.due_date,
        allDay: !task.due_time,
        color: task.priority === "urgent" ? "#dc2626" : "#2563eb",
        href: `/task/RMT-${task.task_number}`,
        task,
        meta: project?.name ?? "Task deadline",
      },
    ];
  });
  const eventItems = events.map((event): CalendarItem => {
    const project = event.project_id
      ? projectMap.get(event.project_id)
      : undefined;
    const category = event.category_id
      ? categoryMap.get(event.category_id)
      : undefined;
    return {
      id: `event:${event.id}`,
      source: event.kind,
      title: event.title,
      start: datePart(event.starts_at),
      end: datePart(event.ends_at),
      allDay: event.all_day,
      color:
        event.kind === "away"
          ? "#d97706"
          : category?.color ?? (project ? "#7c3aed" : "#059669"),
      event,
      meta:
        event.kind === "away"
          ? `${profileMap.get(event.profile_id ?? "")?.full_name ?? "A Ryan"} · Away`
          : project?.name ?? category?.name ?? "Workspace date",
    };
  });
  return [...taskItems, ...eventItems].sort((a, b) =>
    a.start.localeCompare(b.start) || a.title.localeCompare(b.title),
  );
}

export function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - first.getUTCDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
  return { days, year, monthNumber };
}

export function itemsOnDate(items: CalendarItem[], date: string) {
  return items.filter((item) => item.start <= date && item.end >= date);
}
