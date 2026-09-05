import { localDateValue } from "@/lib/tasks/task-scheduling";
import type { Status, Task, TaskAssignee } from "@/lib/tasks/task-types";
import type { ProjectOwner } from "@/lib/resources/resource-types";
import type { Profile } from "@/lib/workspace/workspace-types";

const dayMs = 24 * 60 * 60 * 1000;

function dateAfter(date: Date, days: number) {
  return localDateValue(new Date(date.getTime() + days * dayMs));
}

export type ProjectOverviewMetrics = {
  open: number;
  overdue: number;
  dueSoon: number;
  completed: number;
  total: number;
  completionPercentage: number;
};

export type ProjectBoardPreset = "complete" | "due-soon" | "open" | "overdue";

export type ProjectTeamMember = {
  profile: Profile;
  isOwner: boolean;
};

export function projectTeam(
  projectId: string,
  tasks: Task[],
  projectOwners: ProjectOwner[],
  taskAssignees: TaskAssignee[],
  profiles: Profile[],
): ProjectTeamMember[] {
  const projectTaskIds = new Set(
    tasks
      .filter((task) => task.project_id === projectId)
      .map((task) => task.id),
  );
  const ownerIds = projectOwners
    .filter((owner) => owner.project_id === projectId)
    .map((owner) => owner.profile_id);
  const ownerIdSet = new Set(ownerIds);
  const assignedIds = taskAssignees
    .filter((assignment) => projectTaskIds.has(assignment.task_id))
    .map((assignment) => assignment.profile_id);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return [...new Set([...ownerIds, ...assignedIds])].flatMap((profileId) => {
    const profile = profileById.get(profileId);
    return profile ? [{ profile, isOwner: ownerIdSet.has(profileId) }] : [];
  });
}

export function projectBoardPresetPath(
  projectName: string,
  statuses: Status[],
  preset: ProjectBoardPreset,
) {
  const params = new URLSearchParams({ project: projectName });
  const completedStatuses = statuses
    .filter((status) => status.is_completed)
    .map((status) => status.name)
    .join(",");
  if (preset === "complete") {
    if (completedStatuses) params.set("status", completedStatuses);
  } else {
    if (completedStatuses) params.set("excludeStatuses", completedStatuses);
    if (preset === "overdue") params.set("dueWithin", "overdue");
    if (preset === "due-soon") params.set("dueWithin", "14");
  }
  return `/board?${params.toString()}`;
}

export function projectOverviewMetrics(
  tasks: Task[],
  statuses: Status[],
  today = new Date(),
): ProjectOverviewMetrics {
  const completedStatusIds = new Set(
    statuses.filter((status) => status.is_completed).map((status) => status.id),
  );
  const todayValue = localDateValue(today);
  const soonValue = dateAfter(today, 14);
  const completed = tasks.filter((task) =>
    completedStatusIds.has(task.status_id),
  ).length;
  const active = tasks.filter(
    (task) => !completedStatusIds.has(task.status_id) && !task.archived_at,
  );
  const overdue = active.filter(
    (task) => task.due_date && task.due_date < todayValue,
  ).length;
  const dueSoon = active.filter(
    (task) =>
      task.due_date &&
      task.due_date >= todayValue &&
      task.due_date <= soonValue,
  ).length;
  const total = active.length + completed;
  return {
    open: active.length,
    overdue,
    dueSoon,
    completed,
    total,
    completionPercentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

export type ProjectAttention = {
  task: Task;
  reason: string;
  tone: "danger" | "warning" | "neutral";
};

export function projectNeedsAttention(
  tasks: Task[],
  statuses: Status[],
  assignees: TaskAssignee[],
  today = new Date(),
  limit = 6,
): ProjectAttention[] {
  const completedStatusIds = new Set(
    statuses.filter((status) => status.is_completed).map((status) => status.id),
  );
  const assignedTaskIds = new Set(assignees.map((row) => row.task_id));
  const todayValue = localDateValue(today);
  return tasks
    .filter(
      (task) => !completedStatusIds.has(task.status_id) && !task.archived_at,
    )
    .flatMap((task): Array<ProjectAttention & { rank: number }> => {
      if (task.due_date && task.due_date < todayValue) {
        const days = Math.max(
          1,
          Math.round(
            (new Date(`${todayValue}T12:00:00Z`).getTime() -
              new Date(`${task.due_date}T12:00:00Z`).getTime()) /
              dayMs,
          ),
        );
        return [
          {
            task,
            reason: `Overdue by ${days} ${days === 1 ? "day" : "days"}`,
            tone: "danger",
            rank: 0,
          },
        ];
      }
      if (
        (task.priority === "urgent" || task.priority === "high") &&
        !assignedTaskIds.has(task.id)
      ) {
        return [
          {
            task,
            reason: `${task.priority === "urgent" ? "Urgent" : "High priority"} and unassigned`,
            tone: "warning",
            rank: 1,
          },
        ];
      }
      return [];
    })
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        (left.task.due_date ?? "9999").localeCompare(
          right.task.due_date ?? "9999",
        ) ||
        left.task.task_number - right.task.task_number,
    )
    .slice(0, limit)
    .map(({ task, reason, tone }) => ({ task, reason, tone }));
}

export function projectProgress(tasks: Task[], statuses: Status[]) {
  const completedStatusIds = new Set(
    statuses.filter((status) => status.is_completed).map((status) => status.id),
  );
  const includedTasks = tasks.filter(
    (task) => !task.archived_at || completedStatusIds.has(task.status_id),
  );
  return [...statuses]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((status) => ({
      status,
      count: includedTasks.filter((task) => task.status_id === status.id)
        .length,
    }))
    .filter(({ count }) => count > 0);
}

export function projectUpcomingRange(today = new Date()) {
  return { start: localDateValue(today), end: dateAfter(today, 90) };
}
