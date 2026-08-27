import type { Status } from "@/lib/tasks/task-types";

export type DefaultStatus = Omit<Status, "id" | "order_revision">;

/**
 * The workflow every empty workspace starts with. Keep the database bootstrap
 * in `supabase/seed.sql` and `handle_new_user` aligned with this list.
 */
export const defaultStatuses = [
  {
    name: "Backlog",
    description: "Ideas and requests that are not ready to schedule yet.",
    color: "#64748b",
    sort_order: 0,
    is_default: true,
    is_completed: false,
  },
  {
    name: "Todo",
    description: "Ready to be picked up and worked on.",
    color: "#2563eb",
    sort_order: 1,
    is_default: true,
    is_completed: false,
  },
  {
    name: "In Progress",
    description: "Actively being worked on right now.",
    color: "#d97706",
    sort_order: 2,
    is_default: true,
    is_completed: false,
  },
  {
    name: "In Review",
    description: "Waiting for feedback, approval, or final checks.",
    color: "#7c3aed",
    sort_order: 3,
    is_default: true,
    is_completed: false,
  },
  {
    name: "Done",
    description: "Finished work that no longer needs action.",
    color: "#059669",
    sort_order: 4,
    is_default: true,
    is_completed: true,
  },
  {
    name: "Will Not Do",
    description: null,
    color: "#f51b2b",
    sort_order: 5,
    is_default: true,
    is_completed: false,
  },
] as const satisfies readonly DefaultStatus[];
