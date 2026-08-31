import type { StoredTaskDraft } from "@/lib/tasks/task-drafts";

/**
 * Saved drafts normally live in browser storage, which a first-time demo
 * visitor has none of. These stand in so the dashboard's Drafts widget shows
 * what the feature looks like in use; they live in their own module so the
 * client bundle does not pull in the whole workspace fixture.
 */
const minuteMs = 60 * 1000;
const savedAt = (minutesAgo: number) =>
  new Date(Date.now() - minutesAgo * minuteMs).toISOString();

const emptyDraft = {
  description: null,
  status_id: "backlog",
  project_id: null,
  assignee_id: null,
  reported_by: "taylor",
  start_date: null,
  due_date: null,
  due_time: null,
  reminder_at: null,
  priority: "medium" as const,
  category_ids: [] as string[],
  category_tags: {} as Record<string, string[]>,
  status_reason: "",
};

export const demoTaskDrafts: StoredTaskDraft[] = [
  {
    id: "draft-sponsor-recap",
    updatedAt: savedAt(25),
    draft: {
      ...emptyDraft,
      title: "Write the sponsor recap",
      description: "Numbers from the last event plus two photos.",
      project_id: "fall-launch",
      assignee_id: "taylor",
      priority: "high",
      category_ids: ["partnerships"],
    },
  },
  {
    id: "draft-nav-cleanup",
    updatedAt: savedAt(180),
    draft: {
      ...emptyDraft,
      title: "Clean up the site navigation",
      description: "Too many top-level links. Group them into three.",
      project_id: "website-refresh",
      category_ids: ["web"],
      category_tags: { web: ["Improvement"] },
    },
  },
  {
    id: "draft-photo-release",
    updatedAt: savedAt(1450),
    draft: {
      ...emptyDraft,
      title: "Photo release form",
      description: "Ask the studio whether their template covers us.",
      assignee_id: "alex",
      category_ids: ["creative"],
    },
  },
  {
    id: "draft-untitled",
    updatedAt: savedAt(2900),
    draft: {
      ...emptyDraft,
      title: "",
      description: "Something about moving the standup to Tuesdays?",
    },
  },
];
