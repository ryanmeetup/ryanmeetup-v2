import type { TaskChange } from "./task-change-summary";

export type TaskActivity = {
  id: string;
  task_id: string | null;
  actor_id: string | null;
  action: string;
  details: {
    resource_type?: string;
    resource_id?: string;
    resource_name?: string;
    resource_href?: string;
    project_id?: string;
    /** Field-level diff recorded alongside a task save. */
    changes?: TaskChange[];
    [key: string]: unknown;
  };
  created_at: string;
};
