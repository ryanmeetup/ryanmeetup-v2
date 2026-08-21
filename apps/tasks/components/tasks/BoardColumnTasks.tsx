"use client";

import type { ReactNode } from "react";
import { FiLoader, FiSearch } from "react-icons/fi";
import { useSearchFilter } from "@ryanmeetup/hooks";
import type { Task } from "@/lib/tasks/task-types";
import { taskKey } from "@/lib/tasks/task-key";

export function BoardColumnTasks({
  statusId,
  statusName,
  tasks,
  renderTask,
  onCreate,
}: {
  statusId: string;
  statusName: string;
  tasks: Task[];
  renderTask: (task: Task) => ReactNode;
  onCreate: () => void;
}) {
  const {
    query,
    setQuery,
    filtered: filteredTasks,
    isPending,
  } = useSearchFilter({
    data: tasks,
    buildHaystack: (task) =>
      `${taskKey(task)} ${task.title} ${task.description ?? ""}`.toLowerCase(),
    queryParam: `column-${statusId}`,
  });

  return (
    <div className="space-y-3 p-1" aria-busy={isPending}>
      <div className="relative">
        <FiSearch
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
        />
        <input
          type="search"
          aria-label={`Search ${statusName} tasks`}
          aria-busy={isPending}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${statusName}...`}
          className="h-9 w-full rounded-lg border border-black/10 bg-white pl-9 pr-9 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-white/5 dark:focus:border-white/30"
        />
        {isPending && (
          <FiLoader
            aria-label={`Filtering ${statusName} tasks`}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-black/45 motion-reduce:animate-none dark:text-white/45"
          />
        )}
      </div>
      <div
        className={`space-y-3 transition-opacity ${isPending ? "pointer-events-none opacity-55" : ""}`}
      >
        {filteredTasks.map(renderTask)}
        {filteredTasks.length === 0 && query.trim() && (
          <div className="rounded-xl border border-dashed border-black/15 px-3 py-8 text-center text-xs text-black/50 dark:border-white/15 dark:text-white/50">
            No {statusName} tasks match this search.
          </div>
        )}
        {filteredTasks.length === 0 && !query.trim() && (
          <button
            onClick={onCreate}
            className="w-full rounded-xl border border-dashed border-black/15 px-3 py-8 text-xs text-black/40 hover:border-black/30 hover:text-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60 dark:focus-visible:ring-white/30"
          >
            Drop a task here or add one
          </button>
        )}
      </div>
    </div>
  );
}
