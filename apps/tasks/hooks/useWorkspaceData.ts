"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { WORKSPACE_COLUMNS } from "@/lib/workspace-loader";
import type {
  CategoryOwner,
  Project,
  ProjectOwner,
  Subtask,
  Task,
  TaskActivity,
  TaskAssignee,
  TaskAttachment,
  TaskCategory,
  TaskComment,
  TaskLabel,
  WorkspaceData,
} from "@/lib/types";

type RealtimeRow = Record<string, unknown>;
type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: RealtimeRow;
  old: RealtimeRow;
};

function restoreWorkspace(
  initial: WorkspaceData,
  restored: WorkspaceData,
): WorkspaceData {
  return {
    ...initial,
    ...restored,
    subtasks: restored.subtasks ?? [],
    comments: restored.comments ?? [],
    activity: restored.activity ?? [],
    attachments: restored.attachments ?? [],
    labels: restored.labels ?? [],
    projects: restored.projects ?? [],
    categories: restored.categories ?? initial.categories,
    taskCategories: restored.taskCategories ?? [],
    projectOwners: restored.projectOwners ?? [],
    categoryOwners: restored.categoryOwners ?? [],
    taskAssignees: restored.taskAssignees ?? [],
    taskLabels: restored.taskLabels ?? [],
    statuses: (restored.statuses ?? initial.statuses).map((status) => ({
      ...status,
      is_completed: status.is_completed ?? status.name.toLowerCase() === "done",
    })),
    tasks: restored.tasks.map((task) => ({
      ...task,
      due_time: task.due_time ?? null,
      reminder_at: task.reminder_at ?? null,
      project_id: task.project_id ?? null,
      completed_at: task.completed_at ?? null,
      archived_at: task.archived_at ?? null,
    })),
  };
}

function replaceByKey<T>(rows: T[], row: T, key: (value: T) => string): T[] {
  const rowKey = key(row);
  const index = rows.findIndex((value) => key(value) === rowKey);
  if (index === -1) return [...rows, row];
  const next = [...rows];
  next[index] = { ...rows[index], ...row };
  return next;
}

function removeByKey<T>(
  rows: T[],
  row: RealtimeRow,
  key: (value: T | RealtimeRow) => string,
) {
  const rowKey = key(row);
  return rows.filter((value) => key(value) !== rowKey);
}

function eventRow(payload: RealtimePayload) {
  return payload.eventType === "DELETE" ? payload.old : payload.new;
}

export function useWorkspaceData(
  initialData: WorkspaceData,
  demoMode: boolean,
) {
  const [data, setData] = useState(initialData);
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);
  const getData = useCallback(() => dataRef.current, []);

  useEffect(() => {
    if (!demoMode) return;
    const saved = localStorage.getItem("ryanmeetup.tasks.workspace");
    if (!saved) return;
    try {
      queueMicrotask(() =>
        setData(
          restoreWorkspace(initialData, JSON.parse(saved) as WorkspaceData),
        ),
      );
    } catch {
      localStorage.removeItem("ryanmeetup.tasks.workspace");
    }
  }, [demoMode, initialData]);

  useEffect(() => {
    if (demoMode)
      localStorage.setItem("ryanmeetup.tasks.workspace", JSON.stringify(data));
  }, [data, demoMode]);

  useEffect(() => {
    if (demoMode || initialData.accessPreview) return;

    const supabase = createClient();
    const attachmentPaths = new Set<string>();
    let attachmentTimer: ReturnType<typeof setTimeout> | undefined;
    let taskRefreshTimer: ReturnType<typeof setTimeout> | undefined;
    let taskRefreshRunning = false;
    let taskRefreshQueued = false;

    const signQueuedAttachments = async () => {
      attachmentTimer = undefined;
      const paths = [...attachmentPaths];
      attachmentPaths.clear();
      if (paths.length === 0) return;

      const { data: signed } = await supabase.storage
        .from("task-attachments")
        .createSignedUrls(paths, 60 * 60);
      if (!signed) return;
      const urls = new Map(
        signed.flatMap((item) =>
          item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
        ),
      );
      setData((current) => ({
        ...current,
        attachments: current.attachments.map((attachment) => {
          const url = attachment.file_path
            ? urls.get(attachment.file_path)
            : undefined;
          return url ? { ...attachment, url } : attachment;
        }),
      }));
    };

    const queueAttachmentSigning = (path: string) => {
      attachmentPaths.add(path);
      if (attachmentTimer) clearTimeout(attachmentTimer);
      attachmentTimer = setTimeout(() => void signQueuedAttachments(), 100);
    };

    // Project/access metadata can change which tasks RLS exposes. Collapse a
    // burst into one scoped query and never allow overlapping refreshes.
    const refreshAccessibleTasks = async () => {
      if (taskRefreshRunning) {
        taskRefreshQueued = true;
        return;
      }
      taskRefreshRunning = true;
      const pageSize = dataRef.current.taskPage?.pageSize ?? 100;
      const { data: tasks } = await supabase
        .from("tasks")
        .select(WORKSPACE_COLUMNS.tasks)
        .or(`archived_at.is.null,archived_at.gt.${new Date().toISOString()}`)
        .order("updated_at", { ascending: false })
        .limit(pageSize);
      if (tasks) setData((current) => ({ ...current, tasks }));
      taskRefreshRunning = false;
      if (taskRefreshQueued) {
        taskRefreshQueued = false;
        void refreshAccessibleTasks();
      }
    };

    const queueTaskRefresh = () => {
      if (taskRefreshTimer) clearTimeout(taskRefreshTimer);
      taskRefreshTimer = setTimeout(() => void refreshAccessibleTasks(), 250);
    };

    const isAccessibleTask = (current: WorkspaceData, taskId: unknown) =>
      typeof taskId === "string" &&
      current.tasks.some((task) => task.id === taskId);

    const channel = supabase.channel("workspace-live");

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      (rawPayload) => {
        const payload = rawPayload as unknown as RealtimePayload;
        const row = eventRow(payload);
        if (typeof row.id !== "string") return;
        setData((current) => {
          if (payload.eventType === "DELETE") {
            return {
              ...current,
              tasks: removeByKey(current.tasks, row, (item) => String(item.id)),
            };
          }
          const task = row as Task;
          // Realtime authorization is enforced by the same RLS policy as the
          // initial query. This check also rejects a stale event after access
          // to an existing project was removed.
          if (
            task.project_id &&
            !current.projects.some((project) => project.id === task.project_id)
          ) {
            queueTaskRefresh();
            return current;
          }
          return {
            ...current,
            tasks: replaceByKey(current.tasks, task, (item) => item.id).sort(
              (a, b) => b.updated_at.localeCompare(a.updated_at),
            ),
          };
        });
      },
    );

    const applyTaskChild = <T>(
      payload: RealtimePayload,
      field:
        | "subtasks"
        | "comments"
        | "activity"
        | "taskAssignees"
        | "taskLabels"
        | "taskCategories",
      key: (value: T | RealtimeRow) => string,
      sort?: (a: T, b: T) => number,
    ) => {
      const row = eventRow(payload);
      setData((current) => {
        const rows = current[field] as T[];
        if (payload.eventType === "DELETE") {
          return { ...current, [field]: removeByKey(rows, row, key) };
        }
        if (!isAccessibleTask(current, row.task_id)) return current;
        const next = replaceByKey(rows, row as T, key);
        return { ...current, [field]: sort ? next.sort(sort) : next };
      });
    };

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtasks" },
        (value) =>
          applyTaskChild<Subtask>(
            value as unknown as RealtimePayload,
            "subtasks",
            (item) => String(item.id),
            (a, b) => a.sort_order - b.sort_order,
          ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments" },
        (value) =>
          applyTaskChild<TaskComment>(
            value as unknown as RealtimePayload,
            "comments",
            (item) => String(item.id),
            (a, b) => a.created_at.localeCompare(b.created_at),
          ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_activity" },
        (value) =>
          applyTaskChild<TaskActivity>(
            value as unknown as RealtimePayload,
            "activity",
            (item) => String(item.id),
            (a, b) => b.created_at.localeCompare(a.created_at),
          ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        (value) =>
          applyTaskChild<TaskAssignee>(
            value as unknown as RealtimePayload,
            "taskAssignees",
            (item) => `${String(item.task_id)}:${String(item.profile_id)}`,
          ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_labels" },
        (value) =>
          applyTaskChild<TaskLabel>(
            value as unknown as RealtimePayload,
            "taskLabels",
            (item) => `${String(item.task_id)}:${String(item.label_id)}`,
          ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_categories" },
        (value) =>
          applyTaskChild<TaskCategory>(
            value as unknown as RealtimePayload,
            "taskCategories",
            (item) => `${String(item.task_id)}:${String(item.category_id)}`,
          ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_attachments" },
        (value) => {
          const payload = value as unknown as RealtimePayload;
          const row = eventRow(payload);
          setData((current) => {
            if (payload.eventType === "DELETE") {
              return {
                ...current,
                attachments: removeByKey(current.attachments, row, (item) =>
                  String(item.id),
                ),
              };
            }
            if (!isAccessibleTask(current, row.task_id)) return current;
            const attachment = row as TaskAttachment;
            const existing = current.attachments.find(
              (item) => item.id === attachment.id,
            );
            if (attachment.file_path)
              queueAttachmentSigning(attachment.file_path);
            return {
              ...current,
              attachments: replaceByKey(
                current.attachments,
                existing?.file_path === attachment.file_path
                  ? { ...attachment, url: existing.url }
                  : attachment,
                (item) => item.id,
              ).sort((a, b) => a.created_at.localeCompare(b.created_at)),
            };
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (value) => {
          const payload = value as unknown as RealtimePayload;
          const row = eventRow(payload);
          setData((current) => ({
            ...current,
            projects:
              payload.eventType === "DELETE"
                ? removeByKey(current.projects, row, (item) => String(item.id))
                : replaceByKey(
                    current.projects,
                    row as Project,
                    (item) => item.id,
                  ).sort((a, b) => a.name.localeCompare(b.name)),
          }));
          queueTaskRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_owners" },
        (value) => {
          const payload = value as unknown as RealtimePayload;
          const row = eventRow(payload);
          setData((current) => ({
            ...current,
            projectOwners:
              payload.eventType === "DELETE"
                ? removeByKey(
                    current.projectOwners,
                    row,
                    (item) =>
                      `${String(item.project_id)}:${String(item.profile_id)}`,
                  )
                : replaceByKey(
                    current.projectOwners,
                    row as ProjectOwner,
                    (item) => `${item.project_id}:${item.profile_id}`,
                  ),
          }));
          queueTaskRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "category_owners" },
        (value) => {
          const payload = value as unknown as RealtimePayload;
          const row = eventRow(payload);
          setData((current) => ({
            ...current,
            categoryOwners:
              payload.eventType === "DELETE"
                ? removeByKey(
                    current.categoryOwners,
                    row,
                    (item) =>
                      `${String(item.category_id)}:${String(item.profile_id)}`,
                  )
                : replaceByKey(
                    current.categoryOwners,
                    row as CategoryOwner,
                    (item) => `${item.category_id}:${item.profile_id}`,
                  ),
          }));
        },
      )
      .subscribe();

    return () => {
      if (attachmentTimer) clearTimeout(attachmentTimer);
      if (taskRefreshTimer) clearTimeout(taskRefreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [demoMode, initialData.accessPreview]);

  return { data, setData, getData };
}
