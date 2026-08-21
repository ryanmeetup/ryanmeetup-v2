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
  Pagination,
  Spinner,
  toast,
} from "@ryanmeetup/ui";
import { FiArrowRight } from "react-icons/fi";
import { CategoriesModal, CategoryLabel } from "@/components/categories";
import { WorkspacePageShell } from "@/components/global";
import { filterPanelsExpandedPreferenceKey } from "@/lib/user-preferences";
import { ProjectsModal } from "@/components/projects";
import { withAccessPreview } from "@/lib/access/access-preview";
import { useQueryParamState } from "@ryanmeetup/hooks";
import { usePagination } from "@/hooks/usePagination";
import type { TaskActivity } from "@/lib/activity/activity-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { taskPath } from "@/lib/tasks/task-key";
import { TaskKeyBadge } from "@/components/tasks";
import { ActivityFilterMenu } from "./ActivityFilterMenu";
import { profileDisplayName, splitCommaSeparated } from "@/lib/presentation";
import {
  describeActivity,
  resolveActivityRows,
} from "@/lib/activity/activity-presentation";
import { activityFilterCount, buildActivityQuery } from "@/lib/activity/activity-query";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
  const description = describeActivity(item, statuses);
  if (description.kind === "status") {
    const { from: fromStatus, to: toStatus } = description;

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

  return description.label;
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
  const previewSubjectName = data.accessPreview?.subjectName;
  const activityRows = useMemo(
    () =>
      resolveActivityRows(data.activity, {
        tasks: data.tasks,
        profiles: data.profiles,
        projects: data.projects,
        categories: data.categories,
        statuses: data.statuses,
      }),
    [data],
  );
  const rowsById = useMemo(
    () => new Map(activityRows.map((row) => [row.item.id, row])),
    [activityRows],
  );
  const includedProjectValues = splitCommaSeparated(projectFilter);
  const excludedProjectValues = splitCommaSeparated(excludedProjects);
  const includedPersonValues = splitCommaSeparated(personFilter);
  const excludedPersonValues = splitCommaSeparated(excludedPeople);
  const includedEventValues = splitCommaSeparated(kindFilter);
  const excludedEventValues = splitCommaSeparated(excludedEvents);
  const filters = useMemo(
    () => ({
      projects: projectFilter,
      excludeProjects: excludedProjects,
      people: personFilter,
      excludePeople: excludedPeople,
      events: kindFilter,
      excludeEvents: excludedEvents,
      when: timeFilter,
    }),
    [
      excludedEvents,
      excludedPeople,
      excludedProjects,
      kindFilter,
      personFilter,
      projectFilter,
      timeFilter,
    ],
  );
  const filterCount = activityFilterCount(filters);

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
      splitCommaSeparated(value)
        .map(
          (item) =>
            data.projects.find(
              (project) => project.id === item || project.name === item,
            )?.name ?? item,
        )
        .join(",");
    const readablePeople = (value: string) =>
      splitCommaSeparated(value)
        .map((item) => {
          const profile = data.profiles.find(
            (entry) => entry.id === item || profileDisplayName(entry) === item,
          );
          return profile ? profileDisplayName(profile) : item;
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
    const params = buildActivityQuery(filters, data.projects, data.profiles);
    if (previewKind && previewSubjectId) {
      params.set(
        previewKind === "group" ? "viewAsGroup" : "viewAsUser",
        previewKind === "group" ? previewSubjectId : (previewSubjectName ?? ""),
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
    filters,
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
    previewSubjectName,
    projectFilter,
    syncPage,
    syncPageSize,
    timeFilter,
  ]);

  return (
    <>
      <WorkspacePageShell
        data={data}
        demoMode={demoMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryCreateOpen(true)}
        onCreateProject={() => setProjectCreateOpen(true)}
        setData={setData}
        contentClassName="p-4 sm:p-6 lg:p-8"
      >
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
              Workspace history
            </p>
            <Heading size="h1" className="mt-2 text-4xl">
              Activity
            </Heading>
            <p className="mt-2 text-sm text-black/65 dark:text-white/65">
              The latest task, note, contact, project, and category happenings.
            </p>
          </div>

          <FilterPanel
            collapseOnMobile
            count={filterCount}
            controlsClassName="grid grid-cols-1 gap-3 overflow-visible sm:grid-cols-2 lg:flex lg:gap-2 lg:overflow-x-auto"
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
              stackLabelOnMobile
            />
            <ActivityFilterMenu
              label="Person"
              proximityValue={profileDisplayName(data.currentProfile)}
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
                ...data.profiles.map((profile) => ({
                  avatar: {
                    name: profileDisplayName(profile),
                    src: profile.avatar_url,
                  },
                  label: profileDisplayName(profile),
                  value: profileDisplayName(profile),
                })),
              ]}
              stackLabelOnMobile
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
                { label: "Task deleted", value: "deleted" },
                { label: "Checklist", value: "checklist" },
                { label: "Attachment", value: "attachment" },
                { label: "Notes", value: "note" },
                { label: "Contacts", value: "organization" },
                { label: "Projects", value: "project" },
                { label: "Categories", value: "category" },
              ]}
              stackLabelOnMobile
            />
            <DropdownSelect
              label="When"
              active={timeFilter !== "all"}
              value={timeFilter}
              onChange={(value) => setFilter(setTimeFilter, value)}
              stackLabelOnMobile
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
                  const {
                    task,
                    actor: profile,
                    project,
                    category,
                    resourceName,
                    resourceHref,
                  } = rowsById.get(item.id)!;

                  const content = (
                    <article className="space-y-3 p-4">
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
                          {dateTimeFormatter.format(new Date(item.created_at))}
                        </time>
                      </div>
                      <div className="text-sm">
                        {activityDescription(item, data.statuses)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                        {task ? (
                          <span className="min-w-0 font-semibold">
                            <TaskKeyBadge
                              task={task}
                              className="mr-2 align-middle"
                            />
                            <span>{task.title}</span>
                          </span>
                        ) : resourceName ? (
                          category ? (
                            <CategoryLabel
                              category={category}
                              className="font-semibold"
                            />
                          ) : (
                            <span className="min-w-0 font-semibold">
                              {resourceName}
                            </span>
                          )
                        ) : (
                          <span className="text-black/45 dark:text-white/45">
                            Item unavailable
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

                  const href = task
                    ? withAccessPreview(taskPath(task), data.accessPreview)
                    : resourceHref;
                  return href ? (
                    <Link
                      key={item.id}
                      href={href}
                      className="block transition hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:hover:bg-white/[0.025] dark:focus-visible:ring-white/40"
                      aria-label={`Open ${task?.title ?? resourceName ?? "item"}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id}>{content}</div>
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
                        ? "No activity yet. The next workspace update will show up here."
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
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Project</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/10">
                  {data.activity.map((item) => {
                    const {
                      task,
                      actor: profile,
                      project,
                      category,
                      resourceName,
                      resourceHref,
                    } = rowsById.get(item.id)!;
                    const href = task
                      ? withAccessPreview(taskPath(task), data.accessPreview)
                      : resourceHref;
                    return (
                      <tr
                        key={item.id}
                        className="group relative align-middle transition hover:bg-black/[0.025] focus-within:bg-black/[0.025] dark:hover:bg-white/[0.025] dark:focus-within:bg-white/[0.025]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-black/55 dark:text-white/55">
                          {href && (
                            <Link
                              href={href}
                              aria-label={`Open ${task?.title ?? resourceName ?? "item"}`}
                              className="absolute inset-0 z-10 focus-visible:outline-none group-focus-within:ring-2 group-focus-within:ring-inset group-focus-within:ring-black/30 dark:group-focus-within:ring-white/40"
                            />
                          )}
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
                            <span className="min-w-0">
                              <TaskKeyBadge
                                task={task}
                                className="mr-2 align-middle"
                              />
                              <span>{task.title}</span>
                            </span>
                          ) : resourceName ? (
                            category ? (
                              <CategoryLabel category={category} />
                            ) : (
                              <span className="min-w-0">{resourceName}</span>
                            )
                          ) : (
                            <span className="text-black/45 dark:text-white/45">
                              Item unavailable
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
                              ? "No activity yet. The next workspace update will show up here."
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
              totalCount={data.activityPage?.totalCount ?? data.activity.length}
              itemLabel="events"
              disabled={loading}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </Card>
        </div>
      </WorkspacePageShell>

      {projectCreateOpen && !data.accessPreview && (
        <ProjectsModal
          modal={{ open: projectCreateOpen, setOpen: setProjectCreateOpen }}
          workspace={{ data, setData, demoMode }}
          options={{ createOnly: true }}
        />
      )}
      {categoryCreateOpen && !data.accessPreview && (
        <CategoriesModal
          modal={{ open: categoryCreateOpen, setOpen: setCategoryCreateOpen }}
          workspace={{ data, setData, demoMode }}
          options={{ createOnly: true }}
        />
      )}
    </>
  );
}
