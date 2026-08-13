import {
  Avatar,
  Card,
  DropdownSelect,
  EmptyState,
  Pagination,
} from "@ryanmeetup/ui";
import { FiChevronDown } from "react-icons/fi";
import type { Category, Profile, Project, Status, Task } from "@/lib/types";
import { TaskDueDate } from "./TaskDueDate";
import { TaskKeyBadge } from "./TaskKeyBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";

const profileName = (profile: Profile) => profile.full_name || "Teammate";

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/70 dark:text-white/75"
      style={{
        borderColor: `${category.color}66`,
        backgroundColor: `${category.color}22`,
      }}
    >
      {category.name}
    </span>
  );
}

export function TaskListView({
  assigneesByTask,
  categories,
  categoriesByTask,
  loading,
  onOpenTask,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onToggleSort,
  page,
  pageSize,
  profiles,
  projects,
  sort,
  statuses,
  tasks,
  totalCount,
}: {
  assigneesByTask: Map<string, Set<string>>;
  categories: Map<string, Category>;
  categoriesByTask: Map<string, Set<string>>;
  loading: boolean;
  onOpenTask: (task: Task) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sort: string) => void;
  onToggleSort: () => void;
  page: number;
  pageSize: number;
  profiles: Map<string, Profile>;
  projects: Map<string, Project>;
  sort: string;
  statuses: Status[];
  tasks: Task[];
  totalCount: number;
}) {
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
          {tasks.map((task) => {
            const itemStatus = statuses.find(
              (item) => item.id === task.status_id,
            );
            const taskCategories = [...(categoriesByTask.get(task.id) ?? [])]
              .map((id) => categories.get(id))
              .filter((item) => item !== undefined);
            const taskProject = task.project_id
              ? projects.get(task.project_id)
              : null;
            const taskPeople = [...(assigneesByTask.get(task.id) ?? [])]
              .map((id) => profiles.get(id))
              .filter((person) => person !== undefined);

            return (
              <button
                type="button"
                key={task.id}
                onClick={() => onOpenTask(task)}
                className="block w-full p-4 text-left transition hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:hover:bg-white/[0.025] dark:focus-visible:ring-white/30"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-semibold leading-snug">
                    <TaskKeyBadge task={task} className="mr-2 align-middle" />
                    {task.title}
                  </span>
                  <TaskPriorityBadge priority={task.priority} />
                </span>

                <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-black/60 dark:text-white/60">
                  {itemStatus && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-black/75 dark:text-white/75">
                      <i
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: itemStatus.color }}
                      />
                      {itemStatus.name}
                    </span>
                  )}
                  {taskProject && <span>{taskProject.name}</span>}
                  {taskPeople.length > 0 && (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span className="flex shrink-0 -space-x-1.5">
                        {taskPeople.slice(0, 3).map((person) => (
                          <Avatar
                            key={person.id}
                            name={profileName(person)}
                            size="sm"
                            src={person.avatar_url}
                          />
                        ))}
                      </span>
                      <span className="truncate">
                        {taskPeople.map(profileName).join(", ")}
                      </span>
                    </span>
                  )}
                  {task.due_date && (
                    <TaskDueDate
                      dueDate={task.due_date}
                      isCompleted={itemStatus?.is_completed ?? false}
                      showIcon
                    />
                  )}
                </span>

                {taskCategories.length > 0 && (
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {taskCategories.map((category) => (
                      <CategoryBadge key={category.id} category={category} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
          {tasks.length === 0 && (
            <EmptyState
              variant="plain"
              message="No tasks found. Try clearing a filter or add the first task in this view."
            />
          )}
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
            {tasks.map((task) => {
              const itemStatus = statuses.find(
                (item) => item.id === task.status_id,
              );
              const taskCategories = [...(categoriesByTask.get(task.id) ?? [])]
                .map((id) => categories.get(id))
                .filter((item) => item !== undefined);
              const taskProject = task.project_id
                ? projects.get(task.project_id)
                : null;
              const taskPeople = [...(assigneesByTask.get(task.id) ?? [])]
                .map((id) => profiles.get(id))
                .filter((person) => person !== undefined);
              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  className="cursor-pointer text-sm hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-4">
                    <span className="font-semibold">
                      <TaskKeyBadge task={task} className="mr-2 align-middle" />
                      {task.title}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-2">
                      <i
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: itemStatus?.color }}
                      />
                      {itemStatus?.name}
                    </span>
                  </td>
                  <td>
                    {taskCategories.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5 py-2 pr-3">
                        {taskCategories.map((category) => (
                          <CategoryBadge
                            key={category.id}
                            category={category}
                          />
                        ))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{taskProject?.name ?? "—"}</td>
                  <td>
                    {taskPeople.length > 0 ? (
                      <span className="flex items-center gap-2">
                        <span className="flex -space-x-1.5">
                          {taskPeople.slice(0, 3).map((person) => (
                            <Avatar
                              key={person.id}
                              name={profileName(person)}
                              size="sm"
                              src={person.avatar_url}
                            />
                          ))}
                        </span>
                        {taskPeople.map(profileName).join(", ")}
                      </span>
                    ) : (
                      "Unassigned"
                    )}
                  </td>
                  <td>
                    <TaskPriorityBadge priority={task.priority} />
                  </td>
                  <td>
                    <TaskDueDate
                      dueDate={task.due_date}
                      isCompleted={itemStatus?.is_completed ?? false}
                    />
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    variant="plain"
                    message="No tasks found. Try clearing a filter or add the first task in this view."
                  />
                </td>
              </tr>
            )}
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
