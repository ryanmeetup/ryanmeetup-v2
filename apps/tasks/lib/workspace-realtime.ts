"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TASK_COLUMNS } from "./database-shapes";
import type { WorkspaceData } from "./workspace-types";
import type { RealtimePayload } from "./workspace-state";
import {
  reconcileAttachmentEvent,
  reconcileCategoryOwnerEvent,
  reconcileProjectEvent,
  reconcileProjectOwnerEvent,
  reconcileTaskEvent,
  taskChildReconcilers,
} from "./workspace-reconciliation";

type SetWorkspace = Dispatch<SetStateAction<WorkspaceData>>;

export function subscribeToWorkspace({
  supabase,
  dataRef,
  setData,
}: {
  supabase: SupabaseClient;
  dataRef: MutableRefObject<WorkspaceData>;
  setData: SetWorkspace;
}) {
  const attachmentPaths = new Set<string>();
  let attachmentTimer: ReturnType<typeof setTimeout> | undefined;
  let taskRefreshTimer: ReturnType<typeof setTimeout> | undefined;
  let taskRefreshRunning = false;
  let taskRefreshQueued = false;

  const signAttachments = async () => {
    attachmentTimer = undefined;
    const paths = [...attachmentPaths];
    attachmentPaths.clear();
    if (!paths.length) return;
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
      attachments: current.attachments.map((item) => {
        const url = item.file_path ? urls.get(item.file_path) : undefined;
        return url ? { ...item, url } : item;
      }),
    }));
  };

  const queueAttachmentSigning = (path: string) => {
    attachmentPaths.add(path);
    if (attachmentTimer) clearTimeout(attachmentTimer);
    attachmentTimer = setTimeout(() => void signAttachments(), 100);
  };

  const refreshTasks = async () => {
    if (taskRefreshRunning) {
      taskRefreshQueued = true;
      return;
    }
    taskRefreshRunning = true;
    const { data: tasks } = await supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .or(`archived_at.is.null,archived_at.gt.${new Date().toISOString()}`)
      .order("updated_at", { ascending: false })
      .limit(dataRef.current.taskPage?.pageSize ?? 100);
    if (tasks) setData((current) => ({ ...current, tasks }));
    taskRefreshRunning = false;
    if (taskRefreshQueued) {
      taskRefreshQueued = false;
      void refreshTasks();
    }
  };

  const queueTaskRefresh = () => {
    if (taskRefreshTimer) clearTimeout(taskRefreshTimer);
    taskRefreshTimer = setTimeout(() => void refreshTasks(), 250);
  };
  const asPayload = (value: unknown) => value as RealtimePayload;
  const channel = supabase.channel("workspace-live");

  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "tasks" },
    (value) =>
      setData((current) => {
        const result = reconcileTaskEvent(current, asPayload(value));
        if (result.refreshTasks) queueTaskRefresh();
        return result.data;
      }),
  );
  for (const [table, reconcile] of Object.entries(taskChildReconcilers)) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (value) => setData((current) => reconcile(current, asPayload(value))),
    );
  }
  channel
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "task_attachments" },
      (value) => {
        const payload = asPayload(value);
        const path = payload.eventType === "DELETE" ? null : payload.new.file_path;
        if (typeof path === "string") queueAttachmentSigning(path);
        setData((current) => reconcileAttachmentEvent(current, payload));
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "projects" },
      (value) => {
        setData((current) => reconcileProjectEvent(current, asPayload(value)));
        queueTaskRefresh();
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_owners" },
      (value) => {
        setData((current) =>
          reconcileProjectOwnerEvent(current, asPayload(value)),
        );
        queueTaskRefresh();
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "category_owners" },
      (value) =>
        setData((current) =>
          reconcileCategoryOwnerEvent(current, asPayload(value)),
        ),
    )
    .subscribe();

  return () => {
    if (attachmentTimer) clearTimeout(attachmentTimer);
    if (taskRefreshTimer) clearTimeout(taskRefreshTimer);
    void supabase.removeChannel(channel);
  };
}
