"use client";

import { useCallback, useSyncExternalStore } from "react";

const queryChangeEvent = "ryanmeetup:query-change";

const historyPatchKey = "__ryanmeetupQueryParamHistoryPatched";

function observeHistoryChanges() {
  const patchedWindow = window as typeof window & {
    [historyPatchKey]?: boolean;
  };
  if (patchedWindow[historyPatchKey]) return;

  let notificationQueued = false;
  const notify = () => {
    if (notificationQueued) return;
    notificationQueued = true;
    window.queueMicrotask(() => {
      notificationQueued = false;
      window.dispatchEvent(new Event(queryChangeEvent));
    });
  };
  const pushState = window.history.pushState.bind(window.history);
  const replaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = (...args) => {
    pushState(...args);
    notify();
  };
  window.history.replaceState = (...args) => {
    replaceState(...args);
    notify();
  };
  patchedWindow[historyPatchKey] = true;
}

const subscribe = (onStoreChange: () => void) => {
  observeHistoryChanges();
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(queryChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(queryChangeEvent, onStoreChange);
  };
};

const getSnapshot = () => window.location.search;
const getServerSnapshot = () => "";

type QueryParamUpdate = string | ((currentValue: string) => string);

/** Keeps a piece of UI state shareable without triggering a Next.js navigation. */
const useQueryParamState = (name: string, defaultValue = "") => {
  const search = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const value = new URLSearchParams(search).get(name) ?? defaultValue;

  const setValue = useCallback(
    (update: QueryParamUpdate) => {
      const url = new URL(window.location.href);
      const currentValue = url.searchParams.get(name) ?? defaultValue;
      const nextValue =
        typeof update === "function" ? update(currentValue) : update;

      if (!nextValue || nextValue === defaultValue) {
        url.searchParams.delete(name);
      } else {
        url.searchParams.set(name, nextValue);
      }

      window.history.replaceState(window.history.state, "", url);
    },
    [defaultValue, name],
  );

  return [value, setValue] as const;
};

export { useQueryParamState };
