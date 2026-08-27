import type { Dispatch, SetStateAction } from "react";
import { errorMessage } from "@/lib/presentation";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

export type WorkspaceUpdate = (current: WorkspaceData) => WorkspaceData;

export type OptimisticWrite<T> = {
  /** The change to put on screen immediately. */
  apply: WorkspaceUpdate;
  /** Undoes `apply` when the request fails. */
  revert: WorkspaceUpdate;
  /**
   * The request to make. Leave it out to keep the change local, which is how
   * demo mode edits a workspace that has no server behind it.
   */
  persist?: () => Promise<T>;
  /** Swaps the optimistic row for the one the server actually wrote. */
  reconcile?: (result: T) => WorkspaceUpdate;
  /** Toast text for when the server offers nothing more specific. */
  whenFailed: string;
  /** Restores component state that `apply` cleared, such as a draft input. */
  onFailed?: () => void;
};

/**
 * Runs an optimistic write against the workspace.
 *
 * The change lands on screen first and is undone if the request fails, so a
 * dropped connection cannot leave behind a checklist item that was never
 * saved.
 *
 * `revert` is a targeted inverse rather than a restored snapshot on purpose:
 * realtime updates and other in-flight writes touch the same workspace object,
 * and swapping the whole thing back would silently discard them.
 *
 * Returns whether the write survived, for callers that only close a dialog or
 * announce success once the server has agreed.
 */
export async function optimisticWrite<T>(
  setData: Dispatch<SetStateAction<WorkspaceData>>,
  {
    apply,
    revert,
    persist,
    reconcile,
    whenFailed,
    onFailed,
  }: OptimisticWrite<T>,
  onError: (message: string) => void,
) {
  setData(apply);
  if (!persist) return true;
  try {
    const result = await persist();
    if (reconcile) setData(reconcile(result));
    return true;
  } catch (error) {
    setData(revert);
    onFailed?.();
    onError(errorMessage(error, whenFailed));
    return false;
  }
}
