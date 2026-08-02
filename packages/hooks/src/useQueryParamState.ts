"use client";

import { useCallback, useSyncExternalStore } from "react";

const queryChangeEvent = "ryanmeetup:query-change";

const subscribe = (onStoreChange: () => void) => {
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
      window.dispatchEvent(new Event(queryChangeEvent));
    },
    [defaultValue, name],
  );

  return [value, setValue] as const;
};

export { useQueryParamState };
