"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  FiSearch,
  FiTag,
  FiUsers,
  FiX,
} from "react-icons/fi";
import type { Category, Profile, Project, Status, Task } from "@/lib/types";
import { taskKey, taskPath } from "@/lib/task-key";
import { TaskKeyBadge } from "@/components/tasks/TaskKeyBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import {
  ACCESS_PREVIEW_PARAM,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";

const RESULT_LIMIT = 25;
const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 3;

function normalized(value: string | null | undefined) {
  return value?.toLocaleLowerCase().trim() ?? "";
}

export function TaskSearch({
  tasks,
  projects = [],
  categories = [],
  statuses = [],
  profiles = [],
}: {
  tasks: Task[];
  projects?: Project[];
  categories?: Category[];
  statuses?: Status[];
  profiles?: Profile[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [remoteTasks, setRemoteTasks] = useState<Task[] | null>(null);
  const [remoteTotalCount, setRemoteTotalCount] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const isTooShort = query.trim().length < MIN_QUERY_LENGTH;
  const isPending = query.trim() !== debouncedQuery || isFetching;
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const statusNames = useMemo(
    () => new Map(statuses.map((status) => [status.id, status.name])),
    [statuses],
  );
  const profilesById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = query.trim();
      setDebouncedQuery(nextQuery);
      if (nextQuery.length < MIN_QUERY_LENGTH) setIsFetching(false);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: debouncedQuery });
    [ACCESS_PREVIEW_PARAM, USER_ACCESS_PREVIEW_PARAM].forEach((name) => {
      const preview = searchParams.get(name);
      if (preview) params.set(name, preview);
    });
    fetch(`/api/tasks/search?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Task search failed");
        return (await response.json()) as {
          tasks?: Task[];
          totalCount?: number;
        };
      })
      .then((result) => {
        setRemoteTasks(result.tasks ?? []);
        setRemoteTotalCount(result.totalCount ?? 0);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setRemoteTasks(null);
        setRemoteTotalCount(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsFetching(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, searchParams]);

  const results = useMemo(() => {
    const needle = normalized(debouncedQuery);
    if (needle.length < MIN_QUERY_LENGTH) return [];

    return (remoteTasks ?? tasks)
      .map((task) => {
        const key = normalized(taskKey(task));
        const title = normalized(task.title);
        const description = normalized(task.description);
        const project = normalized(
          task.project_id ? projectNames.get(task.project_id) : "",
        );
        let score = 0;
        if (key === needle) score += 100;
        else if (key.startsWith(needle)) score += 75;
        if (title === needle) score += 90;
        else if (title.startsWith(needle)) score += 65;
        else if (title.includes(needle)) score += 45;
        if (project.includes(needle)) score += 20;
        if (description.includes(needle)) score += 10;
        return { task, score };
      })
      .filter((result) => result.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.task.task_number - left.task.task_number,
      )
      .slice(0, RESULT_LIMIT)
      .map(({ task }) => task);
  }, [debouncedQuery, projectNames, remoteTasks, tasks]);

  const relatedResults = useMemo(() => {
    const needle = normalized(debouncedQuery);
    if (needle.length < MIN_QUERY_LENGTH)
      return { projects: [], categories: [], profiles: [], statuses: [] };
    const matches = (name: string, description?: string | null) =>
      normalized(name).includes(needle) ||
      normalized(description).includes(needle);
    return {
      projects: projects.filter(
        (project) =>
          !project.archived_at && matches(project.name, project.description),
      ),
      categories: categories.filter(
        (category) =>
          !category.archived_at && matches(category.name, category.description),
      ),
      profiles: profiles.filter((profile) => matches(profile.full_name)),
      statuses: statuses.filter((status) => matches(status.name)),
    };
  }, [categories, debouncedQuery, profiles, projects, statuses]);
  const relatedResultCount = Object.values(relatedResults).reduce(
    (count, items) => count + items.length,
    0,
  );
  const groupOrder = new Map(
    [
      ["projects", relatedResults.projects.length],
      ["categories", relatedResults.categories.length],
      ["profiles", relatedResults.profiles.length],
      ["statuses", relatedResults.statuses.length],
      ["issues", remoteTotalCount ?? results.length],
    ]
      .filter(([, count]) => Number(count) > 0)
      .sort((left, right) => Number(left[1]) - Number(right[1]))
      .map(([name], index) => [name, index]),
  );

  function resultPath(task: Task) {
    const params = new URLSearchParams();
    [ACCESS_PREVIEW_PARAM, USER_ACCESS_PREVIEW_PARAM].forEach((name) => {
      const preview = searchParams.get(name);
      if (preview) params.set(name, preview);
    });
    const suffix = params.toString();
    return `${taskPath(task)}${suffix ? `?${suffix}` : ""}`;
  }

  function allResultsPath() {
    const params = new URLSearchParams({
      view: "list",
      q: debouncedQuery,
    });
    [ACCESS_PREVIEW_PARAM, USER_ACCESS_PREVIEW_PARAM].forEach((name) => {
      const preview = searchParams.get(name);
      if (preview) params.set(name, preview);
    });
    return `/board?${params}`;
  }

  function filteredBoardPath(name: string, value: string) {
    const params = new URLSearchParams({ [name]: value });
    [ACCESS_PREVIEW_PARAM, USER_ACCESS_PREVIEW_PARAM].forEach((previewName) => {
      const preview = searchParams.get(previewName);
      if (preview) params.set(previewName, preview);
    });
    return `/board?${params}`;
  }

  function selectTask(task: Task) {
    setOpen(false);
    setQuery("");
    router.push(resultPath(task));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const selected = results[activeIndex] ?? results[0];
    if (selected) {
      selectTask(selected);
      return;
    }
    const firstProject = relatedResults.projects[0];
    const firstCategory = relatedResults.categories[0];
    const firstProfile = relatedResults.profiles[0];
    const firstStatus = relatedResults.statuses[0];
    const path = firstProject
      ? filteredBoardPath("project", firstProject.name)
      : firstCategory
        ? filteredBoardPath("category", firstCategory.name)
        : firstProfile
          ? filteredBoardPath("assignee", firstProfile.full_name || "Teammate")
          : firstStatus
            ? filteredBoardPath("status", firstStatus.name)
            : null;
    if (path) {
      setOpen(false);
      setQuery("");
      router.push(path);
    }
  }

  const showDropdown = open && Boolean(query.trim());

  return (
    <form
      role="search"
      onSubmit={submit}
      className="relative order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto sm:max-w-[35rem]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <FiSearch
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search tasks"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={showDropdown}
        aria-activedescendant={
          showDropdown && !isPending && results[activeIndex]
            ? `${listboxId}-${results[activeIndex].id}`
            : undefined
        }
        aria-busy={isPending}
        autoComplete="off"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setRemoteTasks(null);
          setRemoteTotalCount(null);
          setIsFetching(event.target.value.trim().length >= MIN_QUERY_LENGTH);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          } else if (
            event.key === "ArrowDown" &&
            !isPending &&
            results.length
          ) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => (current + 1) % results.length);
          } else if (event.key === "ArrowUp" && !isPending && results.length) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(
              (current) => (current - 1 + results.length) % results.length,
            );
          }
        }}
        placeholder="Search tasks by title, ID, or project..."
        className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-20 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 [&::-webkit-search-cancel-button]:appearance-none dark:border-white/10 dark:bg-white/5 dark:focus:border-white/30"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            setDebouncedQuery("");
            setRemoteTasks(null);
            setRemoteTotalCount(null);
            setIsFetching(false);
            setOpen(false);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-black/55 hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/40"
        >
          <FiX aria-hidden />
        </button>
      )}
      {isPending && (
        <span
          role="status"
          aria-label="Finding tasks"
          className="absolute right-11 top-1/2 -translate-y-1/2 text-black/45 dark:text-white/45"
        >
          <FiLoader className="animate-spin motion-reduce:animate-none" />
        </span>
      )}

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Task suggestions"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-[50dvh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-black/10 bg-white shadow-xl shadow-black/10 dark:border-white/10 dark:bg-[#202020] dark:shadow-black/40"
        >
          {isTooShort ? (
            <p className="px-4 py-5 text-center text-sm text-black/60 dark:text-white/60">
              Type at least {MIN_QUERY_LENGTH} characters to search.
            </p>
          ) : isPending ? (
            <div
              role="status"
              className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-black/60 dark:text-white/60"
            >
              <FiLoader
                aria-hidden
                className="animate-spin motion-reduce:animate-none"
              />
              Searching across your tasks…
            </div>
          ) : results.length || relatedResultCount ? (
            <div className="flex flex-col">
              {results.length > 0 && (
                <section
                  aria-labelledby={`${listboxId}-issues`}
                  style={{ order: groupOrder.get("issues") }}
                >
                  <p
                    id={`${listboxId}-issues`}
                    className="border-y border-black/5 bg-black/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-white/5 dark:bg-white/[0.025] dark:text-white/45"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FiCheckSquare aria-hidden />
                      Issues
                    </span>
                  </p>
                  {results.map((task, index) => {
                    const projectName = task.project_id
                      ? projectNames.get(task.project_id)
                      : undefined;
                    const statusName = statusNames.get(task.status_id);
                    const assignee = task.assignee_id
                      ? profilesById.get(task.assignee_id)
                      : undefined;
                    return (
                      <button
                        key={task.id}
                        id={`${listboxId}-${task.id}`}
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectTask(task)}
                        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-black/5 px-4 py-3 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/5 dark:focus-visible:ring-white/40 ${
                          index === activeIndex
                            ? "bg-black/[0.045] dark:bg-white/[0.07]"
                            : "hover:bg-black/[0.025] dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {task.title}
                            </span>
                            <TaskKeyBadge task={task} />
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
                              <TaskPriorityBadge
                                priority={task.priority}
                                size="compact"
                              />
                            </span>
                            {assignee && (
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Avatar
                                  name={assignee.full_name || "Teammate"}
                                  src={assignee.avatar_url}
                                  size="sm"
                                />
                                <span className="truncate">
                                  {assignee.full_name || "Teammate"}
                                </span>
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
                                }).format(
                                  new Date(`${task.due_date}T00:00:00Z`),
                                )}
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
                  })}
                </section>
              )}
              {relatedResults.projects.length > 0 && (
                <section
                  aria-labelledby={`${listboxId}-projects`}
                  style={{ order: groupOrder.get("projects") }}
                >
                  <p
                    id={`${listboxId}-projects`}
                    className="border-y border-black/5 bg-black/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-white/5 dark:bg-white/[0.025] dark:text-white/45"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FiFolder aria-hidden />
                      Projects
                    </span>
                  </p>
                  {relatedResults.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={filteredBoardPath("project", project.name)}
                      className="block border-b border-black/5 px-4 py-3 text-sm hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/5 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {project.name}
                        </span>
                        {project.description && (
                          <span className="mt-0.5 block truncate text-xs text-black/55 dark:text-white/55">
                            {project.description}
                          </span>
                        )}
                      </span>
                    </Link>
                  ))}
                </section>
              )}
              {relatedResults.categories.length > 0 && (
                <section
                  aria-labelledby={`${listboxId}-categories`}
                  style={{ order: groupOrder.get("categories") }}
                >
                  <p
                    id={`${listboxId}-categories`}
                    className="border-y border-black/5 bg-black/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-white/5 dark:bg-white/[0.025] dark:text-white/45"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FiLayers aria-hidden />
                      Work groups
                    </span>
                  </p>
                  {relatedResults.categories.map((category) => (
                    <Link
                      key={category.id}
                      href={filteredBoardPath("category", category.name)}
                      className="flex items-center gap-3 border-b border-black/5 px-4 py-3 text-sm hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/5 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/40"
                    >
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate font-semibold">
                        {category.name}
                      </span>
                    </Link>
                  ))}
                </section>
              )}
              {relatedResults.profiles.length > 0 && (
                <section
                  aria-labelledby={`${listboxId}-people`}
                  style={{ order: groupOrder.get("profiles") }}
                >
                  <p
                    id={`${listboxId}-people`}
                    className="border-y border-black/5 bg-black/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-white/5 dark:bg-white/[0.025] dark:text-white/45"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FiUsers aria-hidden />
                      People
                    </span>
                  </p>
                  {relatedResults.profiles.map((profile) => (
                    <Link
                      key={profile.id}
                      href={filteredBoardPath(
                        "assignee",
                        profile.full_name || "Teammate",
                      )}
                      className="flex items-center gap-3 border-b border-black/5 px-4 py-3 text-sm hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/5 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/40"
                    >
                      <Avatar
                        name={profile.full_name || "Teammate"}
                        src={profile.avatar_url}
                        size="sm"
                      />
                      <span className="truncate font-semibold">
                        {profile.full_name || "Teammate"}
                      </span>
                    </Link>
                  ))}
                </section>
              )}
              {relatedResults.statuses.length > 0 && (
                <section
                  aria-labelledby={`${listboxId}-statuses`}
                  style={{ order: groupOrder.get("statuses") }}
                >
                  <p
                    id={`${listboxId}-statuses`}
                    className="border-y border-black/5 bg-black/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:border-white/5 dark:bg-white/[0.025] dark:text-white/45"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FiTag aria-hidden />
                      Statuses
                    </span>
                  </p>
                  {relatedResults.statuses.map((status) => (
                    <Link
                      key={status.id}
                      href={filteredBoardPath("status", status.name)}
                      className="flex items-center gap-3 border-b border-black/5 px-4 py-3 text-sm hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/5 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/40"
                    >
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="truncate font-semibold">
                        {status.name}
                      </span>
                    </Link>
                  ))}
                </section>
              )}
              <div className="sticky bottom-0 order-[999] flex items-center justify-between gap-3 border-t border-black/10 bg-white/95 px-4 py-2.5 text-xs text-black/60 backdrop-blur dark:border-white/10 dark:bg-[#202020]/95 dark:text-white/60">
                <span>
                  Showing {results.length + relatedResultCount} of{" "}
                  {(remoteTotalCount ?? results.length) + relatedResultCount}{" "}
                  matches
                </span>
                {results.length > 0 && (
                  <Link
                    href={allResultsPath()}
                    className="shrink-0 font-semibold text-black underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white dark:focus-visible:ring-white/40"
                  >
                    View all matching issues
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <p className="px-4 py-5 text-center text-sm text-black/60 dark:text-white/60">
              No matching objects found.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
