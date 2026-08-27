import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { subscribeToWorkspace } from "@/lib/workspace/workspace-realtime";
import { demoData } from "@/lib/workspace/demo-data";
import type { RealtimePayload } from "@/lib/workspace/workspace-state";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

type Handler = (value: unknown) => void;

/**
 * A stand-in for the one cached browser client. It reproduces the two traits
 * that made a second subscriber fatal: `channel()` hands back the existing
 * channel for a topic, and `on()` refuses new bindings once `subscribe()` ran.
 */
function fakeSupabase() {
  const channels = new Map<
    string,
    {
      topic: string;
      subscribed: boolean;
      handlers: Map<string, Handler[]>;
      on: (t: string, f: { table: string }, h: Handler) => unknown;
      subscribe: () => unknown;
    }
  >();
  const removed: string[] = [];

  const makeChannel = (topic: string) => {
    const api = {
      topic,
      subscribed: false,
      handlers: new Map<string, Handler[]>(),
      on(_type: string, filter: { table: string }, handler: Handler) {
        if (api.subscribed)
          throw new Error(
            `cannot add \`postgres_changes\` callbacks for realtime:${topic} after \`subscribe()\`.`,
          );
        api.handlers.set(filter.table, [
          ...(api.handlers.get(filter.table) ?? []),
          handler,
        ]);
        return api;
      },
      subscribe() {
        api.subscribed = true;
        return api;
      },
    };
    channels.set(topic, api);
    return api;
  };

  const supabase = {
    channel: (topic: string) => channels.get(topic) ?? makeChannel(topic),
    removeChannel: async (channel: { topic: string }) => {
      removed.push(channel.topic);
      return "ok";
    },
    from: () => ({
      select: () => ({
        or: () => ({
          order: () => ({ limit: async () => ({ data: null }) }),
        }),
      }),
    }),
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
  };

  const emit = (table: string, payload: RealtimePayload) => {
    for (const channel of channels.values())
      for (const handler of channel.handlers.get(table) ?? []) handler(payload);
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    topics: () => [...channels.keys()],
    removed,
    emit,
  };
}

const taskEvent = (title: string): RealtimePayload => ({
  eventType: "UPDATE",
  new: { ...demoData.tasks[0], title },
  old: {},
});

describe("workspace realtime subscription", () => {
  let harness: ReturnType<typeof fakeSupabase>;
  let closers: Array<() => void>;

  const join = (data: WorkspaceData = demoData) => {
    const setData = vi.fn();
    const close = subscribeToWorkspace({
      supabase: harness.supabase,
      dataRef: { current: data },
      setData,
    });
    closers.push(close);
    return { setData, close };
  };

  beforeEach(() => {
    harness = fakeSupabase();
    closers = [];
  });

  // The subscription is module state; leaving one open would leak into the
  // next test the way the shell used to leak into the page client.
  afterEach(() => closers.forEach((close) => close()));

  it("opens one channel for concurrent subscribers", () => {
    const shell = join();
    expect(shell).toBeDefined();
    // The page client mounts inside the already-subscribed shell.
    expect(() => join()).not.toThrow();
    expect(harness.topics()).toHaveLength(1);
  });

  it("fans one event out to every subscriber", () => {
    const shell = join();
    const page = join();

    harness.emit("tasks", taskEvent("Renamed"));

    expect(shell.setData).toHaveBeenCalledTimes(1);
    expect(page.setData).toHaveBeenCalledTimes(1);
  });

  it("keeps the channel until the last subscriber leaves", () => {
    const shell = join();
    const page = join();

    page.close();
    expect(harness.removed).toEqual([]);

    harness.emit("tasks", taskEvent("Still live"));
    expect(shell.setData).toHaveBeenCalledTimes(1);

    shell.close();
    expect(harness.removed).toHaveLength(1);
  });

  it("opens a fresh channel after the last subscriber left", () => {
    join().close();

    expect(() => join()).not.toThrow();
    expect(harness.topics()).toHaveLength(2);
  });

  it("ignores a repeated close from one subscriber", () => {
    const shell = join();
    const page = join();

    page.close();
    page.close();

    harness.emit("tasks", taskEvent("Unaffected"));
    expect(shell.setData).toHaveBeenCalledTimes(1);
    expect(harness.removed).toEqual([]);
  });
});
