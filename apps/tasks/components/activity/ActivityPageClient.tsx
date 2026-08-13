"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Card,
  DropdownSelect,
  EmptyState,
  FilterPanel,
  Heading,
  IconButton,
  Pagination,
  Spinner,
  toast,
} from "@ryanmeetup/ui";
import { FiArrowRight, FiSidebar } from "react-icons/fi";
import { CategoriesModal } from "@/components/categories";
import { TaskBanners } from "@/components/global";
import { filterPanelsExpandedPreferenceKey } from "@/lib/user-preferences";
import {
  TaskHeaderActions,
  TaskHeaderBrand,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import { ProjectsModal } from "@/components/projects";
import { withAccessPreview } from "@/lib/access-preview";
import { useQueryParamState } from "@ryanmeetup/hooks";
import { usePagination } from "@/hooks/usePagination";
import type { TaskActivity, WorkspaceData } from "@/lib/types";
import { taskPath } from "@/lib/task-key";
import { prioritizeCurrentProfile } from "@/lib/profile-order";
import { TaskKeyBadge } from "@/components/tasks/TaskKeyBadge";
import { ActivityFilterMenu } from "./ActivityFilterMenu";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const splitFilterValues = (value: string) => value.split(",").filter(Boolean);

const profileName = (profile: WorkspaceData["profiles"][number]) =>
  profile.full_name || "Teammate";

function StatusLabel({
  status,
}: {
  status: WorkspaceData["statuses"][number];
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      {status.name}
    </span>
  );
}

function activityDescription(
  item: TaskActivity,
  statuses: WorkspaceData["statuses"],
) {
  if (item.action === "moved task") {
    const fromStatusId =
      typeof item.details.from_status_id === "string"
        ? item.details.from_status_id
        : null;
    const toStatusId =
      typeof item.details.status_id === "string"
        ? item.details.status_id
        : null;
    const fromStatus = statuses.find((status) => status.id === fromStatusId);
    const toStatus = statuses.find((status) => status.id === toStatusId);

    if (fromStatus && toStatus) {
      return (
        <span className="flex items-center gap-2">
          <StatusLabel status={fromStatus} />
          <FiArrowRight
            aria-label="moved to"
            className="shrink-0 text-black/40 dark:text-white/40"
          />
          <StatusLabel status={toStatus} />
        </span>
      );
    }
    if (toStatus) {
      return (
        <span className="flex items-center gap-2">
          <span className="text-black/55 dark:text-white/55">Moved to</span>
          <StatusLabel status={toStatus} />
        </span>
      );
    }
    return "Task moved";
  }

  if (item.action === "created the task") return "Task created";
  if (item.action === "updated the task") return "Task updated";
  if (item.action.startsWith("added checklist item"))
    return item.action.replace("added checklist item", "Checklist item added");
  if (item.action.startsWith("attached "))
    return item.action.replace("attached ", "Attachment added: ");

  return item.action.charAt(0).toUpperCase() + item.action.slice(1);
}

export function ActivityPageClient({
  initialData,
  demoMode,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [loading, setLoading] = useState(!demoMode);
  const [projectFilter, setProjectFilter] = useQueryParamState("projects", "");
  const [excludedProjects, setExcludedProjects] = useQueryParamState(
    "excludeProjects",
    "",
  );
  const [personFilter, setPersonFilter] = useQueryParamState("people", "");
  const [excludedPeople, setExcludedPeople] = useQueryParamState(
    "excludePeople",
    "",
  );
  const [kindFilter, setKindFilter] = useQueryParamState("events", "");
  const [excludedEvents, setExcludedEvents] = useQueryParamState(
    "excludeEvents",
    "",
  );
  const [timeFilter, setTimeFilter] = useQueryParamState("when", "all");
  const { page, pageSize, setPage, setPageSize, syncPage, syncPageSize } =
    usePagination();
  const previewKind = data.accessPreview?.kind;
  const previewSubjectId = data.accessPreview?.subjectId;
  const tasks = useMemo(
    () => new Map(data.tasks.map((task) => [task.id, task])),
    [data.tasks],
  );
  const profiles = useMemo(
    () => new Map(data.profiles.map((profile) => [profile.id, profile])),
    [data.profiles],
  );
  const orderedProfiles = useMemo(
    () => prioritizeCurrentProfile(data.profiles, data.currentProfile.id),
    [data.currentProfile.id, data.profiles],
  );
  const includedProjectValues = splitFilterValues(projectFilter);
  const excludedProjectValues = splitFilterValues(excludedProjects);
  const includedPersonValues = splitFilterValues(personFilter);
  const excludedPersonValues = splitFilterValues(excludedPeople);
  const includedEventValues = splitFilterValues(kindFilter);
  const excludedEventValues = splitFilterValues(excludedEvents);
  const filterCount =
    includedProjectValues.length +
    excludedProjectValues.length +
    includedPersonValues.length +
    excludedPersonValues.length +
    includedEventValues.length +
    excludedEventValues.length +
    (timeFilter === "all" ? 0 : 1);

  function setFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setProjectFilter("");
    setExcludedProjects("");
    setPersonFilter("");
    setExcludedPeople("");
    setKindFilter("");
    setExcludedEvents("");
    setTimeFilter("all");
    setPage(1);
  }

  useEffect(() => {
    const readableProjects = (value: string) =>
      splitFilterValues(value)
        .map(
          (item) =>
            data.projects.find(
              (project) => project.id === item || project.name === item,
            )?.name ?? item,
        )
        .join(",");
    const readablePeople = (value: string) =>
      splitFilterValues(value)
        .map((item) => {
          const profile = data.profiles.find(
            (entry) => entry.id === item || profileName(entry) === item,
          );
          return profile ? profileName(profile) : item;
        })
        .join(",");
    const nextProjects = readableProjects(projectFilter);
    const nextExcludedProjects = readableProjects(excludedProjects);
    const nextPeople = readablePeople(personFilter);
    const nextExcludedPeople = readablePeople(excludedPeople);
    if (nextProjects !== projectFilter) setProjectFilter(nextProjects);
    if (nextExcludedProjects !== excludedProjects)
      setExcludedProjects(nextExcludedProjects);
    if (nextPeople !== personFilter) setPersonFilter(nextPeople);
    if (nextExcludedPeople !== excludedPeople)
      setExcludedPeople(nextExcludedPeople);
  }, [
    data.profiles,
    data.projects,
    excludedPeople,
    excludedProjects,
    personFilter,
    projectFilter,
    setExcludedPeople,
    setExcludedProjects,
    setPersonFilter,
    setProjectFilter,
  ]);

  useEffect(() => {
    if (demoMode) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    const projectIds = (value: string) =>
      splitFilterValues(value)
        .map((item) =>
          item === "none"
            ? item
            : (data.projects.find(
                (project) => project.id === item || project.name === item,
              )?.id ?? item),
        )
        .join(",");
    const personIds = (value: string) =>
      splitFilterValues(value)
        .map((item) =>
          item === "system"
            ? item
            : (data.profiles.find(
                (profile) =>
                  profile.id === item || profileName(profile) === item,
              )?.id ?? item),
        )
        .join(",");
    if (projectFilter) params.set("projects", projectIds(projectFilter));
    if (excludedProjects)
      params.set("excludeProjects", projectIds(excludedProjects));
    if (personFilter) params.set("people", personIds(personFilter));
    if (excludedPeople) params.set("excludePeople", personIds(excludedPeople));
    if (kindFilter) params.set("events", kindFilter);
    if (excludedEvents) params.set("excludeEvents", excludedEvents);
    if (timeFilter !== "all") params.set("when", timeFilter);
    if (previewKind && previewSubjectId) {
      params.set(
        previewKind === "group" ? "viewAsGroup" : "viewAsUser",
        previewSubjectId,
      );
    }
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true);
    });
    void fetch(`/api/activity?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as {
          error?: string;
          activity?: WorkspaceData["activity"];
          tasks?: WorkspaceData["tasks"];
          page?: NonNullable<WorkspaceData["activityPage"]>;
        };
        if (!response.ok || !result.activity || !result.tasks || !result.page)
          throw new Error(result.error ?? "Activity could not be loaded.");
        setData((current) => ({
          ...current,
          activity: result.activity!,
          tasks: [
            ...current.tasks.filter(
              (task) => !result.tasks!.some((item) => item.id === task.id),
            ),
            ...result.tasks!,
          ],
          activityPage: result.page,
        }));
        syncPage(result.page.page);
        syncPageSize(result.page.pageSize);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Activity could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    demoMode,
    data.profiles,
    data.projects,
    excludedEvents,
    excludedPeople,
    excludedProjects,
    kindFilter,
    page,
    pageSize,
    personFilter,
    previewKind,
    previewSubjectId,
    projectFilter,
    syncPage,
    syncPageSize,
    timeFilter,
  ]);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={demoMode}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryCreateOpen(true)}
        onCreateProject={() => setProjectCreateOpen(true)}
      />

      <main className="min-w-0 lg:pl-64">
        <header className="tasks-app-header">
          <IconButton
            label="Open navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiSidebar />
          </IconButton>
          <TaskHeaderBrand />
          <TaskSearch
            tasks={data.tasks}
            projects={data.projects}
            categories={data.categories}
            statuses={data.statuses}
            profiles={data.profiles}
          />
          <TaskHeaderActions
            data={data}
            setData={setData}
            demoMode={demoMode}
          />
        </header>
        <TaskBanners preview={data.accessPreview} />

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
                Workspace history
              </p>
              <Heading size="h1" className="mt-2 text-4xl">
                Activity
              </Heading>
              <p className="mt-2 text-sm text-black/65 dark:text-white/65">
                The latest task creations, moves, edits, and other workspace
                happenings.
              </p>
            </div>

            <FilterPanel
              count={filterCount}
              controlsClassName="grid grid-cols-1 overflow-visible min-[360px]:grid-cols-2 [&>button]:min-w-0 [&>button]:w-full [&>button>span]:truncate [&>div]:min-w-0 [&>div>button]:min-w-0 [&>div>button]:w-full [&>div>button>span]:truncate lg:flex lg:overflow-x-auto lg:[&>button]:w-auto lg:[&>div>button]:w-auto"
              defaultExpanded
              onClear={clearFilters}
              preferenceStorageKey={filterPanelsExpandedPreferenceKey}
            >
              <ActivityFilterMenu
                label="Project"
                includedValues={includedProjectValues}
                excludedValues={excludedProjectValues}
                onIncludedChange={(values) =>
                  setFilter(setProjectFilter, values.join(","))
                }
                onExcludedChange={(values) =>
                  setFilter(setExcludedProjects, values.join(","))
                }
                options={[
                  { label: "No project", value: "none" },
                  ...data.projects.map((project) => ({
                    label: `${project.name}${project.archived_at ? " (archived)" : ""}`,
                    value: project.name,
                  })),
                ]}
              />
              <ActivityFilterMenu
                label="Person"
                includedValues={includedPersonValues}
                excludedValues={excludedPersonValues}
                onIncludedChange={(values) =>
                  setFilter(setPersonFilter, values.join(","))
                }
                onExcludedChange={(values) =>
                  setFilter(setExcludedPeople, values.join(","))
                }
                options={[
                  { label: "System", value: "system" },
                  ...orderedProfiles.map((profile) => ({
                    avatar: {
                      name: profile.full_name || "Teammate",
                      src: profile.avatar_url,
                    },
                    label: profile.full_name || "Teammate",
                    value: profileName(profile),
                  })),
                ]}
              />
              <ActivityFilterMenu
                label="Event"
                includedValues={includedEventValues}
                excludedValues={excludedEventValues}
                onIncludedChange={(values) =>
                  setFilter(setKindFilter, values.join(","))
                }
                onExcludedChange={(values) =>
                  setFilter(setExcludedEvents, values.join(","))
                }
                options={[
                  { label: "Task created", value: "created" },
                  { label: "Task updated", value: "updated" },
                  { label: "Task moved", value: "moved" },
                  { label: "Checklist", value: "checklist" },
                  { label: "Attachment", value: "attachment" },
                ]}
              />
              <DropdownSelect
                label="When"
                active={timeFilter !== "all"}
                value={timeFilter}
                onChange={(value) => setFilter(setTimeFilter, value)}
                options={[
                  { label: "Any time", value: "all" },
                  { label: "Past 24 hours", value: "day" },
                  { label: "Past 7 days", value: "week" },
                  { label: "Past 30 days", value: "month" },
                ]}
              />
            </FilterPanel>

            <Card
              size="none"
              className={`overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}
            >
              <div className="md:hidden" aria-busy={loading}>
                <div className="border-b border-black/10 bg-black/[0.025] px-4 py-3 dark:border-white/10 dark:bg-white/[0.025]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
                    Activity
                  </p>
                </div>
                <div className="divide-y divide-black/10 dark:divide-white/10">
                  {data.activity.map((item) => {
                    const task = tasks.get(item.task_id);
                    const profile = item.actor_id
                      ? profiles.get(item.actor_id)
                      : undefined;
                    const project = task?.project_id
                      ? data.projects.find(
                          (entry) => entry.id === task.project_id,
                        )
                      : undefined;

                    return (
                      <article key={item.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 font-semibold">
                            <Avatar
                              name={profile?.full_name ?? "System"}
                              src={profile?.avatar_url}
                              size="sm"
                            />
                            <span className="truncate">
                              {profile?.full_name ?? "System"}
                            </span>
                          </span>
                          <time
                            dateTime={item.created_at}
                            className="shrink-0 text-right text-xs text-black/55 dark:text-white/55"
                          >
                            {dateTimeFormatter.format(
                              new Date(item.created_at),
                            )}
                          </time>
                        </div>
                        <div className="text-sm">
                          {activityDescription(item, data.statuses)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                          {task ? (
                            <Link
                              href={withAccessPreview(
                                taskPath(task),
                                data.accessPreview,
                              )}
                              className="min-w-0 rounded font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40"
                            >
                              <TaskKeyBadge
                                task={task}
                                className="mr-2 align-middle"
                              />
                              <span className="hover:underline">
                                {task.title}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-black/45 dark:text-white/45">
                              Task unavailable
                            </span>
                          )}
                          {project && (
                            <span className="text-black/60 dark:text-white/60">
                              {project.name}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {loading && data.activity.length === 0 && (
                    <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-black/60 dark:text-white/60">
                      <Spinner size={18} label="Loading activity" />
                      <span>Loading activity…</span>
                    </div>
                  )}
                  {!loading && data.activity.length === 0 && (
                    <EmptyState
                      variant="plain"
                      message={
                        filterCount === 0
                          ? "No activity yet. The next task update will show up here."
                          : "No activity matches these filters. Try widening your selection."
                      }
                    />
                  )}
                </div>
              </div>
              <div
                className="hidden overflow-x-auto md:block"
                aria-busy={loading}
              >
                <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[20%] xl:w-[18%]" />
                    <col className="w-[22%] xl:w-[18%]" />
                    <col className="w-[21%] xl:w-[19%]" />
                    <col className="w-[23%] xl:w-[30%]" />
                    <col className="w-[14%] xl:w-[15%]" />
                  </colgroup>
                  <thead className="border-b border-black/10 bg-black/[0.025] text-[10px] uppercase tracking-[0.16em] text-black/50 dark:border-white/10 dark:bg-white/[0.025] dark:text-white/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">When</th>
                      <th className="px-4 py-3 font-semibold">Who</th>
                      <th className="px-4 py-3 font-semibold">What happened</th>
                      <th className="px-4 py-3 font-semibold">Task</th>
                      <th className="px-4 py-3 font-semibold">Project</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 dark:divide-white/10">
                    {data.activity.map((item) => {
                      const task = tasks.get(item.task_id);
                      const profile = item.actor_id
                        ? profiles.get(item.actor_id)
                        : undefined;
                      const project = task?.project_id
                        ? data.projects.find(
                            (entry) => entry.id === task.project_id,
                          )
                        : undefined;
                      return (
                        <tr
                          key={item.id}
                          className="align-middle hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-black/55 dark:text-white/55">
                            <time dateTime={item.created_at}>
                              {dateTimeFormatter.format(
                                new Date(item.created_at),
                              )}
                            </time>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="flex items-center gap-2 font-semibold">
                              <Avatar
                                name={profile?.full_name ?? "System"}
                                src={profile?.avatar_url}
                                size="sm"
                              />
                              {profile?.full_name ?? "System"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate">
                              {activityDescription(item, data.statuses)}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {task ? (
                              <Link
                                href={withAccessPreview(
                                  taskPath(task),
                                  data.accessPreview,
                                )}
                                className="min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40"
                              >
                                <TaskKeyBadge
                                  task={task}
                                  className="mr-2 align-middle"
                                />
                                <span className="hover:underline">
                                  {task.title}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-black/45 dark:text-white/45">
                                Task unavailable
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-black/65 dark:text-white/65">
                            {project?.name ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {loading && data.activity.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-black/60 dark:text-white/60">
                            <Spinner size={18} label="Loading activity" />
                            <span>Loading activity…</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading && data.activity.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            variant="plain"
                            message={
                              filterCount === 0
                                ? "No activity yet. The next task update will show up here."
                                : "No activity matches these filters. Try widening your selection."
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={data.activityPage?.page ?? page}
                pageSize={data.activityPage?.pageSize ?? pageSize}
                totalCount={
                  data.activityPage?.totalCount ?? data.activity.length
                }
                itemLabel="events"
                disabled={loading}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </Card>
          </div>
        </div>
      </main>

      {projectCreateOpen && !data.accessPreview && (
        <ProjectsModal
          open={projectCreateOpen}
          setOpen={setProjectCreateOpen}
          data={data}
          setData={setData}
          demoMode={demoMode}
          createOnly
        />
      )}
      {categoryCreateOpen && !data.accessPreview && (
        <CategoriesModal
          open={categoryCreateOpen}
          setOpen={setCategoryCreateOpen}
          data={data}
          setData={setData}
          demoMode={demoMode}
          createOnly
        />
      )}
    </div>
  );
}
