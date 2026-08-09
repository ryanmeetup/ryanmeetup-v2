"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatedCollapse, IconButton, Pill, Tooltip } from "@ryanmeetup/ui";
import {
  FiCalendar,
  FiClock,
  FiChevronDown,
  FiFolder,
  FiGrid,
  FiHome,
  FiPlus,
  FiX,
} from "react-icons/fi";
import type { WorkspaceData } from "@/lib/types";
import { useSidebarSections } from "@/hooks/useSidebarSections";
import { withAccessPreview } from "@/lib/access-preview";

export function TasksSidebar({
  data,
  demoMode,
  open,
  setOpen,
  onCreateCategory,
  onCreateProject,
}: {
  data: WorkspaceData;
  demoMode: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreateCategory: () => void;
  onCreateProject: () => void;
}) {
  const isOwner =
    !data.accessPreview &&
    (demoMode || data.currentProfile.app_role === "owner");
  const activeProjects = data.projects.filter(
    (project) => !project.archived_at,
  );
  const {
    categoriesExpanded,
    setCategoriesExpanded,
    projectsExpanded,
    setProjectsExpanded,
    sectionsLoaded,
  } = useSidebarSections();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category");
  const selectedProject = searchParams.get("project");
  const isBoard = pathname === "/board";
  const closeSidebar = () => setOpen(false);
  const linkClass = (active: boolean) =>
    `sidebar-link ${active ? "sidebar-link-active" : ""}`;

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-black/10 bg-white px-4 pt-4 transition-transform dark:border-white/10 dark:bg-black lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-12 items-center justify-between px-2">
          <Link
            href={withAccessPreview("/", data.accessPreview)}
            aria-label="Task tracker home"
            className="-ml-2 rounded-lg px-2 py-1 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 motion-reduce:transform-none dark:hover:bg-white/10 dark:focus-visible:ring-white/40"
          >
            <p className="font-cooper text-2xl uppercase">Ryan Meetup</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
              Task tracker
            </p>
          </Link>
          <IconButton
            label="Close navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setOpen(false)}
          >
            <FiX />
          </IconButton>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Main navigation">
          <Link
            href={withAccessPreview("/", data.accessPreview)}
            onClick={closeSidebar}
            className={linkClass(pathname === "/")}
          >
            <FiHome />
            Dashboard
          </Link>
          <Link
            href={withAccessPreview("/board", data.accessPreview)}
            onClick={closeSidebar}
            className={linkClass(isBoard)}
          >
            <FiGrid />
            Tasks
          </Link>
          <Link
            href={withAccessPreview("/activity", data.accessPreview)}
            onClick={closeSidebar}
            className={linkClass(pathname === "/activity")}
          >
            <FiClock />
            Activity
          </Link>
          <Tooltip
            content="Calendar view is coming soon"
            placement="right"
            triggerClassName="w-full"
          >
            <button disabled className="sidebar-link opacity-40">
              <FiCalendar />
              Calendar
              <Pill size="sm" className="ml-auto">
                Soon
              </Pill>
            </button>
          </Tooltip>
        </nav>
        <div className="mt-8 flex min-h-0 flex-1 flex-col">
          <section
            className={`flex max-h-[70%] min-h-0 shrink-0 flex-col overflow-hidden ${categoriesExpanded ? "border-b border-black/10 dark:border-white/10" : ""}`}
          >
            <div className="flex items-center justify-between px-3">
              <button
                type="button"
                aria-expanded={categoriesExpanded}
                onClick={() => setCategoriesExpanded((current) => !current)}
                className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/45 dark:hover:text-white dark:focus-visible:ring-white/40"
              >
                <FiChevronDown
                  className={`transition-transform duration-200 motion-reduce:transition-none ${categoriesExpanded ? "" : "-rotate-90"}`}
                />
                Categories
              </button>
              {isOwner && (
                <span className="flex items-center gap-1">
                  <Link
                    href={withAccessPreview("/categories", data.accessPreview)}
                    className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                  >
                    Manage
                  </Link>
                  <IconButton
                    label="Create category"
                    size="sm"
                    onClick={onCreateCategory}
                  >
                    <FiPlus />
                  </IconButton>
                </span>
              )}
            </div>
            <AnimatedCollapse
              animate={sectionsLoaded}
              open={categoriesExpanded}
              className={categoriesExpanded ? "mt-2 min-h-0 flex-1" : ""}
              contentClassName="h-full scroll-pb-2 space-y-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
            >
              {data.categories.length === 0 && (
                <p className="px-3 py-2 text-xs text-black/50 dark:text-white/50">
                  No categories yet.
                </p>
              )}
              {data.categories.map((category) => (
                <Link
                  key={category.id}
                  href={withAccessPreview(
                    `/board?category=${encodeURIComponent(category.name)}`,
                    data.accessPreview,
                  )}
                  onClick={closeSidebar}
                  className={linkClass(
                    isBoard && selectedCategory === category.name,
                  )}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="truncate">{category.name}</span>
                </Link>
              ))}
            </AnimatedCollapse>
          </section>
          <section
            className={`flex min-h-0 flex-col overflow-hidden pt-4 ${projectsExpanded ? "flex-1" : "shrink-0"}`}
          >
            <div className="flex items-center justify-between px-3">
              <button
                type="button"
                aria-expanded={projectsExpanded}
                onClick={() => setProjectsExpanded((current) => !current)}
                className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/45 dark:hover:text-white dark:focus-visible:ring-white/40"
              >
                <FiChevronDown
                  className={`transition-transform duration-200 motion-reduce:transition-none ${projectsExpanded ? "" : "-rotate-90"}`}
                />
                Projects
              </button>
              <span className="flex items-center gap-1">
                <Link
                  href={withAccessPreview("/projects", data.accessPreview)}
                  className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                >
                  Manage
                </Link>
                {isOwner && (
                  <IconButton
                    label="Create project"
                    size="sm"
                    onClick={onCreateProject}
                  >
                    <FiPlus />
                  </IconButton>
                )}
              </span>
            </div>
            <AnimatedCollapse
              animate={sectionsLoaded}
              open={projectsExpanded}
              className={projectsExpanded ? "mt-2 min-h-0 flex-1" : ""}
              contentClassName="h-full scroll-pb-2 space-y-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
            >
              {activeProjects.length === 0 && (
                <p className="px-3 py-2 text-xs text-black/50 dark:text-white/50">
                  No projects yet.
                </p>
              )}
              {activeProjects.map((project) => (
                <Link
                  key={project.id}
                  href={withAccessPreview(
                    `/board?project=${encodeURIComponent(project.name)}`,
                    data.accessPreview,
                  )}
                  onClick={closeSidebar}
                  className={linkClass(
                    isBoard && selectedProject === project.name,
                  )}
                >
                  <FiFolder className="shrink-0" />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </AnimatedCollapse>
          </section>
        </div>
      </aside>
    </>
  );
}
