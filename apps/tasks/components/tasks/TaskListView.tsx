import { Card, DropdownSelect, Pagination } from "@ryanmeetup/ui";
import { FiChevronDown } from "react-icons/fi";
import type { Category, Project } from "@/lib/resource-types";
import type { Profile } from "@/lib/workspace-types";
import type { Status, Task } from "@/lib/task-types";
import {
  resolveTaskListItems,
  TaskListCards,
  TaskListRows,
} from "./TaskListItems";

export type TaskListData = {
  assigneesByTask: Map<string, Set<string>>;
  categories: Map<string, Category>;
  categoriesByTask: Map<string, Set<string>>;
  profiles: Map<string, Profile>;
  projects: Map<string, Project>;
  statuses: Status[];
  tasks: Task[];
};

export type TaskListPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export type TaskListSorting = {
  value: string;
  onChange: (sort: string) => void;
  onToggle: () => void;
};

export function TaskListView({
  data,
  pagination,
  sorting,
  loading,
  onOpenTask,
}: {
  data: TaskListData;
  pagination: TaskListPagination;
  sorting: TaskListSorting;
  loading: boolean;
  onOpenTask: (task: Task) => void;
}) {
  const { page, pageSize, totalCount, onPageChange, onPageSizeChange } =
    pagination;
  const {
    value: sort,
    onChange: onSortChange,
    onToggle: onToggleSort,
  } = sorting;
  const items = resolveTaskListItems(data);
  return (
    <Card
      size="none"
      className={`overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}
    >
      <div className="md:hidden" aria-busy={loading}>
        <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-black/[0.025] px-4 py-3 dark:border-white/10 dark:bg-white/[0.025]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
            Tasks
          </p>
          <DropdownSelect
            label="Sort"
            value={sort}
            onChange={onSortChange}
            options={[
              { label: "Updated", value: "updated" },
              { label: "Due", value: "due" },
              { label: "Priority", value: "priority" },
            ]}
            className="uppercase tracking-[0.12em]"
          />
        </div>
        <div className="divide-y divide-black/5 dark:divide-white/5">
          <TaskListCards items={items} onOpenTask={onOpenTask} />
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block" aria-busy={loading}>
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-black/10 bg-black/[0.025] text-[10px] uppercase tracking-[0.16em] text-black/50 dark:border-white/10 dark:bg-white/[0.025] dark:text-white/50">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th>Status</th>
              <th>Categories</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>
                <button
                  className="flex items-center gap-1"
                  onClick={onToggleSort}
                >
                  Due <FiChevronDown />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            <TaskListRows items={items} onOpenTask={onOpenTask} />
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        itemLabel="tasks"
        disabled={loading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </Card>
  );
}
