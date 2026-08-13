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
    [key: string]: unknown;
  };
  created_at: string;
};
