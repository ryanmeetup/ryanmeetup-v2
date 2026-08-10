import { Avatar, Card, EmptyState, Pagination } from "@ryanmeetup/ui";
import { FiChevronDown } from "react-icons/fi";
import type {
  Category,
  Priority,
  Profile,
  Project,
  Status,
  Task,
} from "@/lib/types";
import { TaskDueDate } from "./TaskDueDate";
import { TaskKeyBadge } from "./TaskKeyBadge";

const priorityStyles: Record<Priority, string> = {
  low: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  medium:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  high: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  urgent:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
};

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
  onToggleSort,
  page,
  pageSize,
  profiles,
  projects,
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
  onToggleSort: () => void;
  page: number;
  pageSize: number;
  profiles: Map<string, Profile>;
  projects: Map<string, Project>;
  statuses: Status[];
  tasks: Task[];
  totalCount: number;
}) {
  return (
    <Card
      size="none"
      className={`overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}
    >
      <div className="overflow-x-auto" aria-busy={loading}>
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
                    <span className="block font-semibold">{task.title}</span>
                    <TaskKeyBadge task={task} className="mt-1" />
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
                    <span
                      className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${priorityStyles[task.priority]}`}
                    >
                      {task.priority}
                    </span>
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
