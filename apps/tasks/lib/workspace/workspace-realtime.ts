"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TASK_COLUMNS } from "./database-shapes";
import type { WorkspaceData } from "./workspace-types";
import { eventRow, type RealtimePayload } from "./workspace-state";
import { publishResourceAttachmentsChanged } from "@/lib/resources/resource-attachment-events";
import {
  reconcileAttachmentEvent,
  reconcileCategoryOwnerEvent,
  reconcileProjectEvent,
  reconcileProjectOwnerEvent,
  reconcileTaskEvent,
  taskChildReconcilers,
} from "./workspace-reconciliation";

type SetWorkspace = Dispatch<SetStateAction<WorkspaceData>>;

type WorkspaceSubscriber = {
  dataRef: MutableRefObject<WorkspaceData>;
  setData: SetWorkspace;
};

type SharedSubscription = {
  subscribers: Set<WorkspaceSubscriber>;
  close: () => void;
};

/**
 * More than one mounted component holds its own copy of the workspace — the
 * persistent shell and whichever page client is rendered inside it — and each
 * needs the same stream of database events.
 *
 * They cannot each open their own channel. `createBrowserClient` hands every
 * caller one cached client, and its `channel(topic)` returns an existing
 * channel for a topic rather than making a second one, so the second caller
 * used to receive an already-subscribed channel and throw on its first `on()`.
 * Tearing down was just as wrong: the first component to unmount removed the
 * channel out from under the others.
 *
 * So the channel is opened once and reference counted. Every event fans out to
 * all registered subscribers, and the channel closes when the last one leaves.
 */
let shared: SharedSubscription | null = null;

/**
 * The topic carries a suffix because `removeChannel` resolves asynchronously:
 * the closed channel stays in the client's registry until its unsubscribe
 * settles, so a remount that opens a new subscription in the same tick would
 * otherwise be handed the channel that is still tearing down.
 */
let channelSequence = 0;

function createSharedSubscription(
  supabase: SupabaseClient,
): SharedSubscription {
  const subscribers = new Set<WorkspaceSubscriber>();
  const attachmentPaths = new Set<string>();
  let attachmentTimer: ReturnType<typeof setTimeout> | undefined;
  let taskRefreshTimer: ReturnType<typeof setTimeout> | undefined;
  let taskRefreshRunning = false;
  let taskRefreshQueued = false;

  const setData: SetWorkspace = (update) => {
    for (const subscriber of subscribers) subscriber.setData(update);
  };

  /**
   * The largest page any subscriber is currently showing, so a refresh never
   * returns fewer tasks than one of them already has on screen.
   */
  const taskRefreshLimit = () => {
    const sizes = [...subscribers].flatMap(
      (subscriber) => subscriber.dataRef.current.taskPage?.pageSize ?? [],
    );
    return sizes.length ? Math.max(...sizes) : 100;
  };

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
      .limit(taskRefreshLimit());
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
  const channel = supabase.channel(`workspace-live-${++channelSequence}`);

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
  /**
   * Project and category attachments are not part of the workspace snapshot —
   * the board header and the resource editors each fetch their own, signed —
   * so these events only tell those views which resource to reload. A delete
   * carries just the row id, which reloads every view of that kind.
   */
  for (const [table, kind, column] of [
    ["project_attachments", "project", "project_id"],
    ["category_attachments", "category", "category_id"],
  ] as const) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (value) => {
        const resourceId = eventRow(asPayload(value))[column];
        publishResourceAttachmentsChanged({
          kind,
          resourceId: typeof resourceId === "string" ? resourceId : null,
        });
      },
    );
  }
  channel
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "task_attachments" },
      (value) => {
        const payload = asPayload(value);
        const path =
          payload.eventType === "DELETE" ? null : payload.new.file_path;
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

  return {
    subscribers,
    close: () => {
      if (attachmentTimer) clearTimeout(attachmentTimer);
      if (taskRefreshTimer) clearTimeout(taskRefreshTimer);
      void supabase.removeChannel(channel);
    },
  };
}

export function subscribeToWorkspace({
  supabase,
  dataRef,
  setData,
}: {
  supabase: SupabaseClient;
  dataRef: MutableRefObject<WorkspaceData>;
  setData: SetWorkspace;
}) {
  const subscriber: WorkspaceSubscriber = { dataRef, setData };
  const subscription = (shared ??= createSharedSubscription(supabase));
  subscription.subscribers.add(subscriber);

  return () => {
    subscription.subscribers.delete(subscriber);
    if (subscription.subscribers.size) return;
    // A later mount may already have replaced this subscription; only the
    // current one should be cleared.
    if (shared === subscription) shared = null;
    subscription.close();
  };
}
