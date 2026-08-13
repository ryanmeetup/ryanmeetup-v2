export type TaskActivity = {
  id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};
