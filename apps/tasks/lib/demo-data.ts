import type { WorkspaceData } from "./types";

export const demoData: WorkspaceData = {
  currentProfile: { id: "ryan", full_name: "Ryan Admin", avatar_url: null, role: "admin" },
  profiles: [
    { id: "ryan", full_name: "Ryan Admin", avatar_url: null, role: "admin" },
    { id: "alex", full_name: "Alex Ryan", avatar_url: null, role: "member" },
    { id: "jordan", full_name: "Jordan Ryan", avatar_url: null, role: "member" },
  ],
  statuses: [
    { id: "backlog", name: "Backlog", color: "#64748b", sort_order: 0, is_default: true },
    { id: "todo", name: "Todo", color: "#2563eb", sort_order: 1, is_default: true },
    { id: "progress", name: "In Progress", color: "#d97706", sort_order: 2, is_default: true },
    { id: "review", name: "In Review", color: "#7c3aed", sort_order: 3, is_default: true },
    { id: "done", name: "Done", color: "#059669", sort_order: 4, is_default: true },
  ],
  workGroups: [
    { id: "chapter", name: "Chapter Ops", color: "#0f766e", created_by: "ryan" },
    { id: "sponsors", name: "Sponsorships", color: "#c2410c", created_by: "ryan" },
    { id: "web", name: "Web / Tools", color: "#4338ca", created_by: "ryan" },
    { id: "events", name: "Events", color: "#be123c", created_by: "ryan" },
  ],
  tasks: [
    { id: "1", title: "Confirm September venue", description: "Get the final room capacity and load-in details.", status_id: "progress", work_group_id: "events", assignee_id: "alex", created_by: "ryan", start_date: "2026-08-01", due_date: "2026-08-08", priority: "urgent", created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-01T12:00:00Z" },
    { id: "2", title: "Refresh sponsor prospectus", description: "Update benefits and current event dates.", status_id: "review", work_group_id: "sponsors", assignee_id: "jordan", created_by: "ryan", start_date: null, due_date: "2026-08-12", priority: "high", created_at: "2026-08-01T11:00:00Z", updated_at: "2026-08-01T11:00:00Z" },
    { id: "3", title: "Publish chapter host checklist", description: null, status_id: "todo", work_group_id: "chapter", assignee_id: null, created_by: "ryan", start_date: null, due_date: "2026-08-15", priority: "medium", created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z" },
    { id: "4", title: "Fix RSVP confirmation copy", description: "Keep it warm, short, and unmistakably Ryan.", status_id: "backlog", work_group_id: "web", assignee_id: "ryan", created_by: "ryan", start_date: null, due_date: null, priority: "low", created_at: "2026-08-01T09:00:00Z", updated_at: "2026-08-01T09:00:00Z" },
    { id: "5", title: "Send July volunteer thank-yous", description: null, status_id: "done", work_group_id: "chapter", assignee_id: "alex", created_by: "ryan", start_date: null, due_date: "2026-08-02", priority: "medium", created_at: "2026-08-01T08:00:00Z", updated_at: "2026-08-01T08:00:00Z" },
  ],
};
