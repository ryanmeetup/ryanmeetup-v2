"use client";

import { useMemo, type RefObject } from "react";
import { AnimatedCollapse, IconButton } from "@ryanmeetup/ui";
import { FiChevronDown, FiPlus } from "react-icons/fi";
import type { Task } from "@/lib/task-types";
import type { WorkspaceData } from "@/lib/workspace-types";
import { TaskBoardCard } from "./TaskBoardCard";
import { BoardColumnTasks } from "./BoardColumnTasks";
import type { TaskBoardDropTarget } from "@/hooks/useTaskBoardDrag";

function indexByTask<T extends { task_id: string }>(rows: T[]) {
  const index = new Map<string, T[]>();
  for (const row of rows)
    index.set(row.task_id, [...(index.get(row.task_id) ?? []), row]);
  return index;
}

export function TaskBoardView({
  data,
  tasks,
  statuses,
  collapsedStatusIds,
  scrollRef,
  drag,
  onToggleStatus,
  onCreate,
  onOpen,
}: {
  data: WorkspaceData;
  tasks: Task[];
  statuses: WorkspaceData["statuses"];
  collapsedStatusIds: Set<string> | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  drag: {
    state: {
      draggedTaskId: string | null;
      dragOverStatusId: string | null;
      dropTarget: TaskBoardDropTarget | null;
    };
    start: (id: string | null) => void;
    enterColumn: (id: string | null) => void;
    leaveColumn: (id: string) => void;
    overTask: (task: Task, edge: "before" | "after") => void;
    dropOnTask: (task: Task, id: string, edge: "before" | "after") => void;
    dropOnColumn: (id: string, statusId: string) => void;
    cleanup: () => void;
  };
  onToggleStatus: (id: string) => void;
  onCreate: (statusId: string) => void;
  onOpen: (task: Task) => void;
}) {
  const model = useMemo(() => {
    const profiles = new Map(data.profiles.map((item) => [item.id, item]));
    const categories = new Map(data.categories.map((item) => [item.id, item]));
    const projects = new Map(data.projects.map((item) => [item.id, item]));
    const statusIndex = new Map(statuses.map((item) => [item.id, item]));
    const assignees = indexByTask(data.taskAssignees);
    const categoryRows = indexByTask(data.taskCategories);
    const subtasks = indexByTask(data.subtasks);
    const cards = new Map(
      tasks.map((task) => [
        task.id,
        {
          task,
          status: statusIndex.get(task.status_id),
          project: task.project_id
            ? (projects.get(task.project_id) ?? null)
            : null,
          people: (assignees.get(task.id) ?? []).flatMap(
            (row) => profiles.get(row.profile_id) ?? [],
          ),
          categories: (categoryRows.get(task.id) ?? []).flatMap(
            (row) => categories.get(row.category_id) ?? [],
          ),
          subtasks: subtasks.get(task.id) ?? [],
        },
      ]),
    );
    const columns = new Map(
      statuses.map((status) => [
        status.id,
        tasks.filter((task) => task.status_id === status.id),
      ]),
    );
    return { cards, columns };
  }, [
    data.categories,
    data.profiles,
    data.projects,
    data.subtasks,
    data.taskAssignees,
    data.taskCategories,
    statuses,
    tasks,
  ]);

  const renderTask = (task: Task) => {
    const card = model.cards.get(task.id)!;
    return (
      <TaskBoardCard
        {...card}
        draggedTaskId={drag.state.draggedTaskId}
        dropTarget={drag.state.dropTarget}
        onDragStart={drag.start}
        onDragOver={drag.overTask}
        onDrop={drag.dropOnTask}
        onDragEnd={drag.cleanup}
        onOpen={onOpen}
      />
    );
  };

  return (
    <div
      ref={scrollRef}
      className="-mx-4 flex flex-nowrap items-start gap-4 overflow-x-auto overscroll-x-contain px-4 pb-5 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0"
    >
      {statuses.map((status) => {
        const columnTasks = model.columns.get(status.id) ?? [];
        const collapsed = collapsedStatusIds?.has(status.id) ?? false;
        return (
          <section
            key={status.id}
            onDragEnter={(event) => {
              event.preventDefault();
              drag.enterColumn(status.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDragLeave={(event) => {
              const next = event.relatedTarget;
              if (
                !(next instanceof Node) ||
                !event.currentTarget.contains(next)
              )
                drag.leaveColumn(status.id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              drag.dropOnColumn(
                event.dataTransfer.getData("text/task-id"),
                status.id,
              );
            }}
            className={`${collapsed ? "min-h-0 w-[240px]" : "min-h-0 w-[min(320px,calc(100vw-3rem))]"} shrink-0 rounded-2xl p-3 transition-[width,background-color,box-shadow] ${drag.state.dragOverStatusId === status.id ? "bg-black/[0.07] ring-2 ring-inset ring-black/30 dark:bg-white/[0.09] dark:ring-white/40" : "bg-black/[0.035] dark:bg-white/[0.035]"}`}
          >
            <div className="flex items-center gap-2 px-1">
              <i
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <h2 className="shrink-0 whitespace-nowrap text-xs font-bold uppercase tracking-[0.16em]">
                {status.name}
              </h2>
              <span className="text-xs text-black/40 dark:text-white/40">
                {columnTasks.length}
              </span>
              <IconButton
                label={`Add task to “${status.name}”`}
                tooltipTriggerClassName="ml-auto"
                onClick={() => onCreate(status.id)}
              >
                <FiPlus />
              </IconButton>
              <IconButton
                label={`${collapsed ? "Expand" : "Collapse"} “${status.name}”`}
                aria-expanded={!collapsed}
                aria-controls={`status-column-${status.id}`}
                onClick={() => onToggleStatus(status.id)}
              >
                <FiChevronDown
                  className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
                />
              </IconButton>
            </div>
            {!collapsed && status.description && (
              <p className="mt-2 px-1 text-sm leading-snug text-black/60 dark:text-white/60">
                {status.description}
              </p>
            )}
            <AnimatedCollapse
              id={`status-column-${status.id}`}
              open={!collapsed}
              className={collapsed ? "" : "mt-3"}
            >
              <BoardColumnTasks
                statusId={status.id}
                statusName={status.name}
                tasks={columnTasks}
                renderTask={renderTask}
                onCreate={() => onCreate(status.id)}
              />
            </AnimatedCollapse>
          </section>
        );
      })}
    </div>
  );
}
