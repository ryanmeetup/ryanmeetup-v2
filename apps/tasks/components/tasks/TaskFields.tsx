"use client";

import type { Dispatch, SetStateAction } from "react";
import { FiStar } from "react-icons/fi";
import {
  DropdownSelect,
  Input,
  MultiSelect,
  RichTextarea,
  Tooltip,
} from "@ryanmeetup/ui";
import type { Category, Project } from "@/lib/resource-types";
import type { Priority, Status } from "@/lib/task-types";
import type { Profile } from "@/lib/workspace-types";
import type { TaskDraft } from "@/lib/task-mutations";
import { profileDisplayName } from "@/lib/presentation";
import { sortFavoriteProjectsFirst } from "@/lib/project-sort";

const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export type TaskFieldOptions = {
  statuses: Status[];
  categories: Category[];
  projects: Project[];
  favoriteProjectIds: string[];
  profiles: Profile[];
  currentProfileId: string;
};

export function TaskFields({
  draft,
  setDraft,
  options,
  density = "full",
}: {
  draft: TaskDraft;
  setDraft: Dispatch<SetStateAction<TaskDraft>>;
  options: TaskFieldOptions;
  density?: "full" | "quick";
}) {
  const favoriteProjectIds = new Set(options.favoriteProjectIds);
  const tagOptions = options.categories
    .filter((category) => draft.category_ids.includes(category.id))
    .flatMap((category) =>
      (category.tags ?? []).map((tag) => ({
        group: { color: category.color, label: category.name },
        label: tag,
        value: JSON.stringify([category.id, tag]),
      })),
    );
  const selectedTagValues = Object.entries(draft.category_tags).flatMap(
    ([categoryId, tags]) =>
      tags.map((tag) => JSON.stringify([categoryId, tag])),
  );

  function patch(next: Partial<TaskDraft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  return (
    <div className="min-w-0 space-y-5">
      <Input
        label="Task title"
        name="task-title"
        required
        value={draft.title}
        onChange={(event) => patch({ title: event.target.value })}
        placeholder="What needs doing?"
      />
      {density === "full" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="task-description" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/70 sm:tracking-[0.3em] dark:text-white/70">
            Description
          </label>
          <RichTextarea
            id="task-description"
            name="description"
            aria-label="Description"
            value={draft.description ?? ""}
            onChange={(event) => patch({ description: event.target.value })}
            placeholder="Add useful context, links, or a tiny pep talk…"
          />
        </div>
      )}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <DropdownSelect variant="field" label="Status" required value={draft.status_id} onChange={(status_id) => patch({ status_id })} options={options.statuses.map((item) => ({ label: item.name, value: item.id }))} />
        <DropdownSelect variant="field" label="Priority" required value={draft.priority} onChange={(priority) => patch({ priority: priority as Priority })} options={priorities.map((item) => ({ label: item[0].toUpperCase() + item.slice(1), value: item }))} />
        <fieldset className="sm:col-span-2" aria-required="true">
          <legend className="mb-2 flex gap-1 text-sm font-semibold"><span>Categories</span><span className="text-red-500">*</span></legend>
          <div className="flex flex-wrap gap-2">
            {options.categories.filter((item) => !item.archived_at || draft.category_ids.includes(item.id)).map((item) => {
              const selected = draft.category_ids.includes(item.id);
              return (
                <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-within:ring-2 focus-within:ring-black/20 dark:focus-within:ring-white/30 ${selected ? "border-black/25 bg-black text-white dark:border-white/30 dark:bg-white dark:text-black" : "border-black/10 bg-white dark:border-white/10 dark:bg-white/5"}`}>
                  <input type="checkbox" className="sr-only" checked={selected} onChange={() => patch({ category_ids: selected ? draft.category_ids.filter((id) => id !== item.id) : [...draft.category_ids, item.id], category_tags: selected ? Object.fromEntries(Object.entries(draft.category_tags).filter(([id]) => id !== item.id)) : draft.category_tags })} />
                  <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}
                </label>
              );
            })}
          </div>
        </fieldset>
        {density === "full" && <DropdownSelect variant="field" label="Project" proximityGroup="Favorites" value={draft.project_id ?? ""} onChange={(project_id) => patch({ project_id: project_id || null })} options={[{ label: "No project", value: "" }, ...sortFavoriteProjectsFirst(options.projects.filter((item) => !item.archived_at || item.id === draft.project_id), options.favoriteProjectIds).map((item) => ({ group: favoriteProjectIds.has(item.id) ? { icon: <FiStar aria-hidden className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-500 dark:fill-yellow-300 dark:text-yellow-400" />, label: "Favorites" } : { label: "Projects" }, label: `${item.name}${item.archived_at ? " (archived)" : ""}`, value: item.id }))]} />}
        <DropdownSelect variant="field" label="Assignee" proximityValue={options.currentProfileId} value={draft.assignee_id ?? ""} onChange={(assignee_id) => patch({ assignee_id: assignee_id || null })} options={[{ label: "Unassigned", value: "" }, ...options.profiles.map((item) => ({ avatar: { name: profileDisplayName(item), src: item.avatar_url }, label: profileDisplayName(item), value: item.id }))]} />
        {density === "full" && <DropdownSelect variant="field" label="Reported by" proximityValue={options.currentProfileId} required value={draft.reported_by} onChange={(reported_by) => patch({ reported_by })} options={options.profiles.map((item) => ({ avatar: { name: profileDisplayName(item), src: item.avatar_url }, label: profileDisplayName(item), value: item.id }))} />}
        <label className="date-field"><span>Due date</span><input type="date" value={draft.due_date ?? ""} onChange={(event) => patch({ due_date: event.target.value || null, due_time: event.target.value ? draft.due_time : null })} /></label>
        {density === "full" && <MultiSelect label="Tags" options={tagOptions} value={selectedTagValues} onChange={(values) => { const category_tags: Record<string, string[]> = {}; for (const value of values) { const [categoryId, tag] = JSON.parse(value) as [string, string]; category_tags[categoryId] = [...(category_tags[categoryId] ?? []), tag]; } patch({ category_tags }); }} searchable searchPlaceholder="Search tags" disabled={tagOptions.length === 0} placeholder={draft.category_ids.length === 0 ? "Select a category first" : "No tags for selected categories"} />}
        {density === "full" && (
          <label className="date-field opacity-60">
            <span>Reminder</span>
            <Tooltip
              content="Reminders are coming soon."
              triggerClassName="w-full !block !text-sm !font-normal !normal-case !tracking-normal"
            >
              <span
                className="block w-full cursor-help"
                tabIndex={0}
                aria-label="Reminder is coming soon"
              >
                <input
                  type="datetime-local"
                  value=""
                  disabled
                  aria-label="Reminder (coming soon)"
                  className="cursor-not-allowed"
                />
              </span>
            </Tooltip>
          </label>
        )}
      </div>
    </div>
  );
}
