"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Button,
  Card,
  DropdownSelect,
  EmptyState,
  Heading,
  IconButton,
  Pagination,
  Spinner,
  toast,
} from "@ryanmeetup/ui";
import { FiArrowRight, FiFilter, FiMenu, FiX } from "react-icons/fi";
import { CategoriesModal } from "@/components/categories";
import { TaskBanners } from "@/components/global";
import { TaskHeaderActions, TasksSidebar } from "@/components/navigation";
import { ProjectsModal } from "@/components/projects";
import { withAccessPreview } from "@/lib/access-preview";
import { useQueryParamState } from "@ryanmeetup/hooks";
import { usePagination } from "@/hooks/usePagination";
import type { TaskActivity, WorkspaceData } from "@/lib/types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function StatusLabel({ status }: { status: WorkspaceData["statuses"][number] }) {
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
      typeof item.details.status_id === "string" ? item.details.status_id : null;
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
  const [projectFilter, setProjectFilter] = useQueryParamState("project", "all");
  const [personFilter, setPersonFilter] = useQueryParamState("person", "all");
  const [kindFilter, setKindFilter] = useQueryParamState("event", "all");
  const [timeFilter, setTimeFilter] = useQueryParamState("when", "all");
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    syncPage,
    syncPageSize,
  } = usePagination();
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
  const filterCount = [projectFilter, personFilter, kindFilter, timeFilter].filter(
    (value) => value !== "all",
  ).length;

  function setFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setProjectFilter("all");
    setPersonFilter("all");
    setKindFilter("all");
    setTimeFilter("all");
    setPage(1);
  }

  useEffect(() => {
    if (demoMode) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (projectFilter !== "all") params.set("project", projectFilter);
    if (personFilter !== "all") params.set("person", personFilter);
    if (kindFilter !== "all") params.set("event", kindFilter);
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
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(
          error instanceof Error ? error.message : "Activity could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    demoMode,
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/10 bg-[#f7f7f5]/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#101010]/90 sm:px-6 lg:px-8">
          <IconButton
            label="Open navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu />
          </IconButton>
          <p className="font-semibold">Activity</p>
          <TaskHeaderActions data={data} setData={setData} demoMode={demoMode} />
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

            <Card size="sm">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="flex shrink-0 items-center gap-2 pr-2 text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                  <FiFilter aria-hidden />
                  Filters
                  {filterCount > 0 && (
                    <b className="grid h-5 w-5 place-items-center rounded-full bg-black text-[10px] text-white dark:bg-white dark:text-black">
                      {filterCount}
                    </b>
                  )}
                </span>
                <DropdownSelect
                  label="Project"
                  value={projectFilter}
                  onChange={(value) => setFilter(setProjectFilter, value)}
                  options={[
                    { label: "All projects", value: "all" },
                    { label: "No project", value: "none" },
                    ...data.projects.map((project) => ({
                      label: `${project.name}${project.archived_at ? " (archived)" : ""}`,
                      value: project.id,
                    })),
                  ]}
                />
                <DropdownSelect
                  label="Person"
                  value={personFilter}
                  onChange={(value) => setFilter(setPersonFilter, value)}
                  options={[
                    { label: "Everyone", value: "all" },
                    { label: "System", value: "system" },
                    ...data.profiles.map((profile) => ({
                      avatar: {
                        name: profile.full_name || "Teammate",
                        src: profile.avatar_url,
                      },
                      label: profile.full_name || "Teammate",
                      value: profile.id,
                    })),
                  ]}
                />
                <DropdownSelect
                  label="Event"
                  value={kindFilter}
                  onChange={(value) => setFilter(setKindFilter, value)}
                  options={[
                    { label: "All events", value: "all" },
                    { label: "Task created", value: "created" },
                    { label: "Task updated", value: "updated" },
                    { label: "Task moved", value: "moved" },
                    { label: "Checklist", value: "checklist" },
                    { label: "Attachment", value: "attachment" },
                  ]}
                />
                <DropdownSelect
                  label="When"
                  value={timeFilter}
                  onChange={(value) => setFilter(setTimeFilter, value)}
                  options={[
                    { label: "Any time", value: "all" },
                    { label: "Past 24 hours", value: "day" },
                    { label: "Past 7 days", value: "week" },
                    { label: "Past 30 days", value: "month" },
                  ]}
                />
                {filterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FiX />}
                    onClick={clearFilters}
                    className="shrink-0"
                  >
                    Clear
                  </Button>
                )}
                <span
                  aria-live="polite"
                  className="ml-auto shrink-0 pl-2 text-xs text-black/50 dark:text-white/50"
                >
                  {data.activityPage?.totalCount ?? data.activity.length}{" "}
                  {(data.activityPage?.totalCount ?? data.activity.length) === 1
                    ? "event"
                    : "events"}
                </span>
              </div>
            </Card>

            <Card
              size="none"
              className={`overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}
            >
              <div className="overflow-x-auto" aria-busy={loading}>
                <table className="w-full min-w-[760px] text-left text-sm">
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
                        ? data.projects.find((entry) => entry.id === task.project_id)
                        : undefined;
                      return (
                        <tr key={item.id} className="align-middle hover:bg-black/[0.025] dark:hover:bg-white/[0.025]">
                          <td className="whitespace-nowrap px-4 py-3 text-black/55 dark:text-white/55">
                            <time dateTime={item.created_at}>
                              {dateTimeFormatter.format(new Date(item.created_at))}
                            </time>
                          </td>
                          <td className="px-4 py-3">
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
                            {activityDescription(item, data.statuses)}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {task ? (
                              <Link
                                href={withAccessPreview(
                                  `/board?task=${encodeURIComponent(task.id)}`,
                                  data.accessPreview,
                                )}
                                className="rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40"
                              >
                                {task.title}
                              </Link>
                            ) : (
                              <span className="text-black/45 dark:text-white/45">Task unavailable</span>
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
                totalCount={data.activityPage?.totalCount ?? data.activity.length}
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
