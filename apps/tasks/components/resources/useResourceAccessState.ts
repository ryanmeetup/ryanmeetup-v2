"use client";

import { useEffect, useRef, useState } from "react";
import { LatestRequestTracker } from "@/lib/latest-request";

type ResourceAccessResult<TGroup, TMode> = {
  groups: TGroup[];
  accessMode?: TMode;
  groupIds?: string[];
};

export function useResourceAccessState<TGroup, TMode>({
  initialAccessMode,
  demoMode,
}: {
  initialAccessMode: TMode;
  demoMode: boolean;
}) {
  const requests = useRef(new LatestRequestTracker());
  const [groups, setGroups] = useState<TGroup[]>([]);
  const [accessMode, setAccessMode] = useState(initialAccessMode);
  const [savedAccessMode, setSavedAccessMode] = useState(initialAccessMode);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [savedGroupIds, setSavedGroupIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(demoMode);

  useEffect(
    () => () => {
      const active = requests.current.getActive();
      if (active) requests.current.abort(active);
    },
    [],
  );

  function begin(nextAccessMode: TMode) {
    const active = requests.current.getActive();
    if (active) requests.current.abort(active);
    setAccessMode(nextAccessMode);
    setSavedAccessMode(nextAccessMode);
    setGroupIds([]);
    setSavedGroupIds([]);
    setLoaded(demoMode);
  }

  async function load(
    request: (signal: AbortSignal) => Promise<ResourceAccessResult<TGroup, TMode>>,
    { applySelection = true }: { applySelection?: boolean } = {},
  ) {
    const ticket = requests.current.start();
    setLoaded(false);
    try {
      const result = await request(ticket.controller.signal);
      if (!requests.current.isLatest(ticket)) return false;
      setGroups(result.groups);
      if (applySelection) {
        if (result.accessMode !== undefined) {
          setAccessMode(result.accessMode);
          setSavedAccessMode(result.accessMode);
        }
        const nextGroupIds = result.groupIds ?? [];
        setGroupIds(nextGroupIds);
        setSavedGroupIds(nextGroupIds);
      }
      setLoaded(true);
      return true;
    } catch (error) {
      if (!requests.current.isLatest(ticket)) return false;
      throw error;
    } finally {
      requests.current.finish(ticket);
    }
  }

  function commit() {
    setSavedAccessMode(accessMode);
    setSavedGroupIds(groupIds);
  }

  return {
    groups,
    selection: {
      accessMode,
      groupIds,
      savedAccessMode,
      savedGroupIds,
    },
    changes: { setAccessMode, setGroupIds },
    loaded,
    begin,
    load,
    commit,
  };
}
