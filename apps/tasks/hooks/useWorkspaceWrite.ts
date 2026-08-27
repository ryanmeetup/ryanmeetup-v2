"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "@ryanmeetup/ui";
import {
  optimisticWrite,
  type OptimisticWrite,
} from "@/lib/workspace/optimistic-write";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

export type {
  OptimisticWrite,
  WorkspaceUpdate,
} from "@/lib/workspace/optimistic-write";

/** Binds `optimisticWrite` to a workspace setter and the toast surface. */
export function useWorkspaceWrite(
  setData: Dispatch<SetStateAction<WorkspaceData>>,
) {
  return useCallback(
    <T>(write: OptimisticWrite<T>) =>
      optimisticWrite(setData, write, toast.error),
    [setData],
  );
}
