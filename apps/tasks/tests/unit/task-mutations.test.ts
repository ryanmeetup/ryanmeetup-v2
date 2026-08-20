import { describe, expect, it, vi } from "vitest";
import { mutate } from "@/lib/mutation-client";
import { createTaskMutationService, type TaskDraft } from "@/lib/task-mutations";
import type { Task } from "@/lib/task-types";
import type { WorkspaceData } from "@/lib/workspace-types";

vi.mock("@/lib/mutation-client", () => ({ mutate: vi.fn() }));

describe("task mutations", () => {
  it("keeps the submitted assignee when the save response omits it", async () => {
    const assigneeId = "profile-1";
    const task = {
      id: "task-1",
      title: "Chapter request",
      project_id: "ryanmeetup-project",
      assignee_id: assigneeId,
    } as Task;
    vi.mocked(mutate).mockResolvedValue({
      task,
      assignees: [],
      categories: [],
    });
    const draft = {
      title: task.title,
      description: null,
      status_id: "status-1",
      project_id: task.project_id,
      assignee_id: assigneeId,
      reported_by: "profile-reporter",
      start_date: null,
      due_date: null,
      due_time: null,
      reminder_at: null,
      priority: "medium",
      category_ids: ["category-1"],
      category_tags: {},
    } satisfies TaskDraft;
    const service = createTaskMutationService({
      demoMode: false,
      getData: () => ({}) as WorkspaceData,
      setData: vi.fn(),
    });

    const saved = await service.save(draft, task);

    expect(saved.assignees).toEqual([
      { task_id: task.id, profile_id: assigneeId },
    ]);
  });

  it("keeps the submitted categories when the save response omits them", async () => {
    const categoryId = "category-1";
    const task = {
      id: "task-1",
      title: "Chapter request",
      project_id: "ryanmeetup-project",
    } as Task;
    vi.mocked(mutate).mockResolvedValue({
      task,
      assignees: [],
      categories: [],
    });
    const draft = {
      title: task.title,
      description: null,
      status_id: "status-1",
      project_id: task.project_id,
      assignee_id: null,
      reported_by: "profile-reporter",
      start_date: null,
      due_date: null,
      due_time: null,
      reminder_at: null,
      priority: "medium",
      category_ids: [categoryId],
      category_tags: {},
    } satisfies TaskDraft;
    const service = createTaskMutationService({
      demoMode: false,
      getData: () => ({}) as WorkspaceData,
      setData: vi.fn(),
    });

    const saved = await service.save(draft, task);

    expect(saved.categories).toEqual([
      { task_id: task.id, category_id: categoryId },
    ]);
  });
});
