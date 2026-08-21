import Link from "next/link";
import { Avatar } from "@ryanmeetup/ui";
import {
  FiArrowUpRight,
  FiCalendar,
  FiCheckSquare,
  FiFlag,
  FiFolder,
  FiLayers,
  FiLoader,
  FiTag,
  FiUsers,
} from "react-icons/fi";
import type { Task } from "@/lib/tasks/task-types";
import type { Profile } from "@/lib/workspace/workspace-types";
import type {
  TaskSearchGroup,
  TaskSearchRelatedResults,
} from "@/lib/tasks/task-search";
import { profileDisplayName } from "@/lib/presentation";
import { TaskKeyBadge, TaskPriorityBadge } from "@/components/tasks";

type Props = {
  listboxId: string;
  isPending: boolean;
  isTooShort: boolean;
  results: Task[];
  related: TaskSearchRelatedResults;
  groupOrder: ReadonlyMap<TaskSearchGroup, number>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  selectTask: (task: Task) => void;
  projectNames: ReadonlyMap<string, string>;
  statusNames: ReadonlyMap<string, string>;
  profilesById: ReadonlyMap<string, Profile>;
  remoteTotalCount: number | null;
  allResultsHref: string;
  filterHref: (name: string, value: string) => string;
};

const headingClass =
  "border-y border-black/5 bg-black/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-white/5 dark:bg-white/[0.025] dark:text-white/45";
const linkClass =
  "block border-b border-black/5 px-4 py-3 text-sm hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/5 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/40";

function GroupHeading({
  id,
  icon,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p id={id} className={headingClass}>
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {children}
      </span>
    </p>
  );
}

function TaskResultItem({
  task,
  id,
  active,
  onActivate,
  onSelect,
  projectName,
  statusName,
  assignee,
}: {
  task: Task;
  id: string;
  active: boolean;
  onActivate: () => void;
  onSelect: () => void;
  projectName?: string;
  statusName?: string;
  assignee?: Profile;
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onActivate}
      onClick={onSelect}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-black/5 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/5 dark:focus-visible:ring-white/40 ${active ? "bg-black/[0.045] dark:bg-white/[0.07]" : "hover:bg-black/[0.025] dark:hover:bg-white/[0.04]"}`}
    >
      <span className="min-w-0">
        <span className="text-sm font-semibold">
          <TaskKeyBadge task={task} className="mr-2 align-middle" />
          {task.title}
        </span>
        <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/55 dark:text-white/55">
          {projectName && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <FiFolder aria-hidden className="shrink-0" />
              <span className="truncate">{projectName}</span>
            </span>
          )}
          {statusName && (
            <span className="inline-flex items-center gap-1">
              <FiTag aria-hidden />
              {statusName}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <FiFlag aria-hidden />
            <TaskPriorityBadge priority={task.priority} size="compact" />
          </span>
          {assignee && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Avatar
                name={profileDisplayName(assignee)}
                src={assignee.avatar_url}
                size="sm"
              />
              <span className="truncate">{profileDisplayName(assignee)}</span>
            </span>
          )}
          {task.due_date && (
            <span className="inline-flex items-center gap-1">
              <FiCalendar aria-hidden />
              <span className="sr-only">Due </span>
              {new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${task.due_date}T00:00:00Z`))}
            </span>
          )}
        </span>
      </span>
      <FiArrowUpRight
        aria-hidden
        className="mt-1 text-black/35 dark:text-white/35"
      />
    </button>
  );
}

export function TaskSearchResults(props: Props) {
  const {
    listboxId,
    isPending,
    isTooShort,
    results,
    related,
    groupOrder,
    activeIndex,
    setActiveIndex,
    selectTask,
    projectNames,
    statusNames,
    profilesById,
    remoteTotalCount,
    allResultsHref,
    filterHref,
  } = props;
  const relatedCount = Object.values(related).reduce(
    (count, items) => count + items.length,
    0,
  );
  const hasResults = Boolean(results.length || relatedCount);

  return (
    <div
      id={listboxId}
      role="listbox"
      aria-label="Task suggestions"
      aria-busy={isPending}
      className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-[50dvh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-black/10 bg-white shadow-xl shadow-black/10 dark:border-white/10 dark:bg-[#202020] dark:shadow-black/40"
    >
      {isTooShort ? (
        <p className="px-4 py-5 text-center text-sm text-black/60 dark:text-white/60">
          Type at least 3 characters to search.
        </p>
      ) : (
        <div className="relative">
          {isPending && (
            <div
              role="status"
              className="sticky top-0 z-10 flex items-center justify-center gap-2 border-b border-black/5 bg-white/95 px-4 py-2 text-sm text-black/60 backdrop-blur dark:border-white/5 dark:bg-[#202020]/95 dark:text-white/60"
            >
              <FiLoader
                aria-hidden
                className="animate-spin motion-reduce:animate-none"
              />
              Searching across your tasks…
            </div>
          )}
          <div
            aria-disabled={isPending || undefined}
            className={`flex flex-col transition-opacity ${isPending ? "pointer-events-none opacity-55" : ""}`}
          >
            {!hasResults && !isPending && (
              <p className="px-4 py-5 text-center text-sm text-black/60 dark:text-white/60">
                No matching objects found.
              </p>
            )}
            {results.length > 0 && (
              <section
                aria-labelledby={`${listboxId}-issues`}
                style={{ order: groupOrder.get("issues") }}
              >
                <GroupHeading
                  id={`${listboxId}-issues`}
                  icon={<FiCheckSquare aria-hidden />}
                >
                  Issues
                </GroupHeading>
                {results.map((task, index) => (
                  <TaskResultItem
                    key={task.id}
                    task={task}
                    id={`${listboxId}-${task.id}`}
                    active={index === activeIndex}
                    onActivate={() => setActiveIndex(index)}
                    onSelect={() => selectTask(task)}
                    projectName={
                      task.project_id
                        ? projectNames.get(task.project_id)
                        : undefined
                    }
                    statusName={statusNames.get(task.status_id)}
                    assignee={
                      task.assignee_id
                        ? profilesById.get(task.assignee_id)
                        : undefined
                    }
                  />
                ))}
              </section>
            )}
            {related.projects.length > 0 && (
              <section
                aria-labelledby={`${listboxId}-projects`}
                style={{ order: groupOrder.get("projects") }}
              >
                <GroupHeading
                  id={`${listboxId}-projects`}
                  icon={<FiFolder aria-hidden />}
                >
                  Projects
                </GroupHeading>
                {related.projects.map((item) => (
                  <Link
                    key={item.id}
                    href={filterHref("project", item.name)}
                    className={linkClass}
                  >
                    <span className="block truncate font-semibold">
                      {item.name}
                    </span>
                    {item.description && (
                      <span className="mt-0.5 block truncate text-xs text-black/55 dark:text-white/55">
                        {item.description}
                      </span>
                    )}
                  </Link>
                ))}
              </section>
            )}
            {related.categories.length > 0 && (
              <section
                aria-labelledby={`${listboxId}-categories`}
                style={{ order: groupOrder.get("categories") }}
              >
                <GroupHeading
                  id={`${listboxId}-categories`}
                  icon={<FiLayers aria-hidden />}
                >
                  Work groups
                </GroupHeading>
                {related.categories.map((item) => (
                  <Link
                    key={item.id}
                    href={filterHref("category", item.name)}
                    className={`${linkClass} flex items-center gap-3`}
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate font-semibold">{item.name}</span>
                  </Link>
                ))}
              </section>
            )}
            {related.profiles.length > 0 && (
              <section
                aria-labelledby={`${listboxId}-people`}
                style={{ order: groupOrder.get("profiles") }}
              >
                <GroupHeading
                  id={`${listboxId}-people`}
                  icon={<FiUsers aria-hidden />}
                >
                  People
                </GroupHeading>
                {related.profiles.map((item) => (
                  <Link
                    key={item.id}
                    href={filterHref("assignee", profileDisplayName(item))}
                    className={`${linkClass} flex items-center gap-3`}
                  >
                    <Avatar
                      name={profileDisplayName(item)}
                      src={item.avatar_url}
                      size="sm"
                    />
                    <span className="truncate font-semibold">
                      {profileDisplayName(item)}
                    </span>
                  </Link>
                ))}
              </section>
            )}
            {related.statuses.length > 0 && (
              <section
                aria-labelledby={`${listboxId}-statuses`}
                style={{ order: groupOrder.get("statuses") }}
              >
                <GroupHeading
                  id={`${listboxId}-statuses`}
                  icon={<FiTag aria-hidden />}
                >
                  Statuses
                </GroupHeading>
                {related.statuses.map((item) => (
                  <Link
                    key={item.id}
                    href={filterHref("status", item.name)}
                    className={`${linkClass} flex items-center gap-3`}
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate font-semibold">{item.name}</span>
                  </Link>
                ))}
              </section>
            )}
            {hasResults && (
              <div className="sticky bottom-0 order-[999] flex items-center justify-between gap-3 border-t border-black/10 bg-white/95 px-4 py-2.5 text-xs text-black/60 backdrop-blur dark:border-white/10 dark:bg-[#202020]/95 dark:text-white/60">
                <span>
                  Showing {results.length + relatedCount} of{" "}
                  {(remoteTotalCount ?? results.length) + relatedCount} matches
                </span>
                {results.length > 0 && (
                  <Link
                    href={allResultsHref}
                    className="shrink-0 font-semibold text-black underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white dark:focus-visible:ring-white/40"
                  >
                    View all matching issues
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
