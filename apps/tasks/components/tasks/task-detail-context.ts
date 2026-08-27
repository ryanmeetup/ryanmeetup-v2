import type { Dispatch, SetStateAction } from "react";
import type { Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

/**
 * What every task detail panel hook needs: the task being viewed, the
 * workspace it lives in, and a way to note an action in demo mode.
 *
 * `recordActivity` exists because demo mode has no save transaction to write
 * an audit row, so the activity panel would otherwise sit empty while the
 * server-backed path fills in.
 */
export type TaskDetailContext = {
  task: Task;
  data: WorkspaceData;
  demoMode: boolean;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  recordActivity: (action: string) => Promise<void>;
};
