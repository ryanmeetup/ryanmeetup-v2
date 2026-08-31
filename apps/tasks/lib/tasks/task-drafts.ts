import type { TaskDraft } from "./task-mutations";

export type StoredTaskDraft = {
  id: string;
  draft: TaskDraft;
  updatedAt: string;
};

const storagePrefix = "ryanmeetup:task-drafts:";
export const taskDraftsChangedEvent = "task-drafts-changed";
export const taskDraftAutosaveDelayMs = 4000;
const draftTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function draftSavedStatus(kind: "auto" | "manual", date = new Date()) {
  const action = kind === "auto" ? "Autosaved draft" : "Draft saved";
  return `${action} at ${draftTimeFormatter.format(date)}`;
}

function storageKey(profileId: string) {
  return `${storagePrefix}${profileId}`;
}

export function readTaskDrafts(profileId: string): StoredTaskDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(
      localStorage.getItem(storageKey(profileId)) ?? "[]",
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is StoredTaskDraft =>
          Boolean(item) &&
          typeof item.id === "string" &&
          typeof item.updatedAt === "string" &&
          typeof item.draft === "object",
      )
      .map((item) => ({
        ...item,
        draft: {
          ...item.draft,
          category_tags: item.draft.category_tags ?? {},
          status_reason: item.draft.status_reason ?? "",
        },
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function saveTaskDraft(
  profileId: string,
  draft: TaskDraft,
  id = crypto.randomUUID(),
) {
  const saved = { id, draft, updatedAt: new Date().toISOString() };
  const drafts = readTaskDrafts(profileId).filter((item) => item.id !== id);
  localStorage.setItem(
    storageKey(profileId),
    JSON.stringify([saved, ...drafts]),
  );
  window.dispatchEvent(new CustomEvent(taskDraftsChangedEvent));
  return saved;
}

export function deleteTaskDraft(profileId: string, id: string) {
  const drafts = readTaskDrafts(profileId).filter((item) => item.id !== id);
  localStorage.setItem(storageKey(profileId), JSON.stringify(drafts));
  window.dispatchEvent(new CustomEvent(taskDraftsChangedEvent));
}

export function hasDraftContent(draft: TaskDraft) {
  return Boolean(
    draft.title.trim() ||
    draft.description?.trim() ||
    draft.project_id ||
    draft.assignee_id ||
    draft.due_date ||
    draft.category_ids.length,
  );
}

export function hasDraftAutosaveContent(draft: TaskDraft) {
  return Boolean(
    draft.title.trim() ||
    draft.description?.trim() ||
    draft.start_date ||
    draft.due_date ||
    draft.due_time ||
    draft.reminder_at,
  );
}
