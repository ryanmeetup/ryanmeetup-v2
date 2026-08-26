"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeToWorkspace } from "@/lib/workspace/workspace-realtime";
import { restoreWorkspace } from "@/lib/workspace/workspace-state";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

// Versioned so fixture changes do not restore stale demo branding and content.
const STORAGE_KEY = "ryanmeetup.tasks.workspace.v2";

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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      queueMicrotask(() =>
        setData(
          restoreWorkspace(initialData, JSON.parse(saved) as WorkspaceData),
        ),
      );
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [demoMode, initialData]);

  useEffect(() => {
    if (demoMode) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, demoMode]);

  useEffect(() => {
    if (demoMode || initialData.accessPreview) return;
    return subscribeToWorkspace({ supabase: createClient(), dataRef, setData });
  }, [demoMode, initialData.accessPreview]);

  return { data, setData, getData };
}
