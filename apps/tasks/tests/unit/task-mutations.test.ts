import { describe, expect, it, vi } from "vitest";
import { mutate } from "@/lib/mutation-client";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/task-mutations";
import type { Task } from "@/lib/task-types";
import type { WorkspaceData } from "@/lib/workspace-types";

vi.mock("@/lib/mutation-client", () => ({ mutate: vi.fn() }));

describe("task mutations", () => {
  it("keeps a standalone deletion event in demo activity", async () => {
    const task = {
      id: "task-1",
      title: "Chapter request",
      project_id: "project-1",
    } as Task;
    let data = {
      currentProfile: { id: "profile-1" },
      tasks: [task],
      subtasks: [],
      comments: [],
      activity: [
        {
          id: "old-activity",
          task_id: task.id,
          actor_id: "profile-1",
          action: "created the task",
          details: {},
          created_at: "2026-08-20T12:00:00.000Z",
        },
      ],
      attachments: [],
      taskAssignees: [],
      taskLabels: [],
      taskCategories: [],
    } as unknown as WorkspaceData;
    const service = createTaskMutationService({
      demoMode: true,
      getData: () => data,
      setData: (update) => {
        data = typeof update === "function" ? update(data) : update;
      },
    });

    await service.remove(task.id);

    expect(data.tasks).toEqual([]);
    expect(data.activity).toMatchObject([
      {
        task_id: null,
        actor_id: "profile-1",
        action: "task.delete",
        details: {
          resource_id: task.id,
          resource_name: task.title,
          project_id: task.project_id,
        },
      },
    ]);
  });

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
