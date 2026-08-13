"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useQueryParamState } from "@ryanmeetup/hooks";
import {
  AnimatedCollapse,
  DropdownMenu,
  DropdownMenuButton,
  DropdownMenuItem,
  DropdownMenuItems,
  Pill,
} from "@ryanmeetup/ui";
import {
  FiCalendar,
  FiClock,
  FiChevronDown,
  FiFolder,
  FiGrid,
  FiHome,
  FiFileText,
  FiPlus,
  FiUsers,
  FiStar,
  FiTag,
  FiX,
} from "react-icons/fi";
import { useEffect } from "react";
import type { WorkspaceData } from "@/lib/workspace-types";
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
  const canManageCategories =
    !data.accessPreview && (demoMode || data.canManageCategories);
  const activeProjects = data.projects.filter(
    (project) => !project.archived_at,
  );
  const activeCategories = data.categories.filter(
    (category) => !category.archived_at,
  );
  const favoriteProjects = activeProjects.filter((project) =>
    (data.currentProfile.favorite_project_ids ?? []).includes(project.id),
  );
  const favoriteProjectIds = new Set(
    favoriteProjects.map((project) => project.id),
  );
  const otherProjects = activeProjects.filter(
    (project) => !favoriteProjectIds.has(project.id),
  );
  const {
    favoritesExpanded,
    setFavoritesExpanded,
    categoriesExpanded,
    setCategoriesExpanded,
    projectsExpanded,
    setProjectsExpanded,
    sectionsLoaded,
  } = useSidebarSections();
  const pathname = usePathname();
  const [selectedCategory] = useQueryParamState("category");
  const [selectedProject] = useQueryParamState("project");
  const isBoard = pathname === "/board";
  const isNotes = pathname === "/notes";
  const isContacts = pathname === "/contacts";
  const isTasksRoute = isBoard || pathname.startsWith("/task/");
  const selectedProjectIsFavorite = favoriteProjects.some(
    (project) =>
      project.id === selectedProject || project.name === selectedProject,
  );
  const closeSidebar = () => setOpen(false);
  const isCategorySelected = (id: string, name: string) =>
    isBoard && (selectedCategory === id || selectedCategory === name);
  const isProjectSelected = (id: string, name: string) =>
    isBoard && (selectedProject === id || selectedProject === name);
  const boardHref = (filter?: { category?: string; project?: string }) => {
    const params = new URLSearchParams();
    if (filter?.category) params.set("category", filter.category);
    if (filter?.project) params.set("project", filter.project);
    const query = params.toString();
    return withAccessPreview(
      `/board${query ? `?${query}` : ""}`,
      data.accessPreview,
    );
  };
  const linkClass = (active: boolean) =>
    `sidebar-link ${active ? "sidebar-link-active" : ""}`;

  useEffect(() => {
    if (selectedCategory) setCategoriesExpanded(true);
    if (selectedProject) {
      if (selectedProjectIsFavorite) {
        setFavoritesExpanded(true);
      } else {
        setProjectsExpanded(true);
      }
    }
  }, [
    selectedCategory,
    selectedProject,
    selectedProjectIsFavorite,
    setFavoritesExpanded,
    setCategoriesExpanded,
    setProjectsExpanded,
  ]);

  const sidebarContent = (mobile = false) => (
    <>
      <div
        className={`relative flex h-12 items-center px-2 ${mobile ? "pr-12" : ""}`}
      >
        <Link
          href={withAccessPreview("/", data.accessPreview)}
          aria-label="Task tracker home"
          className="-ml-2 min-w-0 rounded-lg px-2 py-1 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 motion-reduce:transform-none dark:hover:bg-white/10 dark:focus-visible:ring-white/40"
        >
          <p
            className={`whitespace-nowrap font-cooper uppercase ${mobile ? "text-xl" : "text-2xl"}`}
          >
            Ryan Meetup
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
            Task tracker
          </p>
        </Link>
        {mobile && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeSidebar}
            className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-xl text-black/60 transition hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/40"
          >
            <FiX aria-hidden />
          </button>
        )}
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
          className={linkClass(isTasksRoute)}
        >
          <FiGrid />
          Tasks
        </Link>
        <Link
          href={withAccessPreview("/notes", data.accessPreview)}
          onClick={closeSidebar}
          className={linkClass(isNotes)}
        >
          <FiFileText />
          Notes
        </Link>
        <Link
          href={withAccessPreview("/contacts", data.accessPreview)}
          onClick={closeSidebar}
          className={linkClass(isContacts)}
        >
          <FiUsers />
          Contacts
        </Link>
        <Link
          href={withAccessPreview("/activity", data.accessPreview)}
          onClick={closeSidebar}
          className={linkClass(pathname === "/activity")}
        >
          <FiClock />
          Activity
        </Link>
        <div
          className="sidebar-link cursor-default opacity-50"
          aria-label="Calendar, coming soon"
        >
          <FiCalendar />
          Calendar
          <Pill size="sm" className="ml-auto">
            Soon
          </Pill>
        </div>
      </nav>
      {(isOwner || canManageCategories) && (
        <section className="mt-4 border-y border-black/10 py-3 dark:border-white/10">
          <DropdownMenu>
            <DropdownMenuButton
              unstyled
              className="flex w-full items-center gap-3 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2.5 text-left text-sm font-semibold text-black/70 transition hover:border-black/20 hover:bg-black/[0.07] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/40"
            >
              <FiPlus aria-hidden />
              New
              <FiChevronDown className="ml-auto" aria-hidden />
            </DropdownMenuButton>
            <DropdownMenuItems align="start" className="w-56">
              {isOwner && (
                <DropdownMenuItem
                  onClick={() => {
                    closeSidebar();
                    onCreateProject();
                  }}
                >
                  <FiFolder aria-hidden /> New project
                </DropdownMenuItem>
              )}
              {canManageCategories && <DropdownMenuItem
                onClick={() => {
                  closeSidebar();
                  onCreateCategory();
                }}
              >
                <FiTag aria-hidden /> New category
              </DropdownMenuItem>}
            </DropdownMenuItems>
          </DropdownMenu>
        </section>
      )}
      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4 pr-1 [scrollbar-gutter:stable]">
        {favoriteProjects.length > 0 && (
          <section className="shrink-0 border-b border-black/10 pb-4 dark:border-white/10">
            <div className="flex items-center justify-between px-3">
              <button
                type="button"
                aria-expanded={favoritesExpanded}
                onClick={() => setFavoritesExpanded((current) => !current)}
                className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/45 dark:hover:text-white dark:focus-visible:ring-white/40"
              >
                <FiChevronDown
                  className={`transition-transform duration-200 motion-reduce:transition-none ${favoritesExpanded ? "" : "-rotate-90"}`}
                />
                Favorites
              </button>
              <Link
                href={withAccessPreview("/projects", data.accessPreview)}
                className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
              >
                Manage
              </Link>
            </div>
            <AnimatedCollapse
              animate={sectionsLoaded}
              open={favoritesExpanded}
              className={favoritesExpanded ? "mt-2" : ""}
              contentClassName="space-y-1"
            >
              {favoriteProjects.map((project) => (
                <Link
                  key={project.id}
                  href={boardHref(
                    isProjectSelected(project.id, project.name)
                      ? undefined
                      : { project: project.name },
                  )}
                  onClick={closeSidebar}
                  className={linkClass(
                    isProjectSelected(project.id, project.name),
                  )}
                >
                  <FiStar
                    className="shrink-0 text-amber-600 dark:text-amber-300"
                    fill="currentColor"
                  />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </AnimatedCollapse>
          </section>
        )}
        <section
          className={`border-b border-black/10 pb-4 dark:border-white/10`}
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
            <Link
              href={withAccessPreview("/categories", data.accessPreview)}
              className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              {canManageCategories ? "Manage" : "View all"}
            </Link>
          </div>
          <AnimatedCollapse
            animate={sectionsLoaded}
            open={categoriesExpanded}
            className={categoriesExpanded ? "mt-2" : ""}
            contentClassName="space-y-1"
          >
            {activeCategories.length === 0 && (
              <p className="px-3 py-2 text-xs text-black/50 dark:text-white/50">
                No categories yet.
              </p>
            )}
            {activeCategories.map((category) => (
              <Link
                key={category.id}
                href={boardHref(
                  isCategorySelected(category.id, category.name)
                    ? undefined
                    : { category: category.name },
                )}
                onClick={closeSidebar}
                className={linkClass(
                  isCategorySelected(category.id, category.name),
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
        <section className="pb-2">
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
            <Link
              href={withAccessPreview("/projects", data.accessPreview)}
              className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              Manage
            </Link>
          </div>
          <AnimatedCollapse
            animate={sectionsLoaded}
            open={projectsExpanded}
            className={projectsExpanded ? "mt-2" : ""}
            contentClassName="space-y-1"
          >
            {otherProjects.length === 0 && (
              <p className="px-3 py-2 text-xs text-black/50 dark:text-white/50">
                {favoriteProjects.length > 0
                  ? "All projects are favorited."
                  : "No projects yet."}
              </p>
            )}
            {otherProjects.map((project) => (
              <Link
                key={project.id}
                href={boardHref(
                  isProjectSelected(project.id, project.name)
                    ? undefined
                    : { project: project.name },
                )}
                onClick={closeSidebar}
                className={linkClass(
                  isProjectSelected(project.id, project.name),
                )}
              >
                <FiFolder className="shrink-0" />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </AnimatedCollapse>
        </section>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-black/10 bg-white px-4 pt-4 dark:border-white/10 dark:bg-black lg:flex">
        {sidebarContent()}
      </aside>
      <Dialog open={open} onClose={setOpen} className="relative z-50 lg:hidden">
        <DialogBackdrop className="fixed inset-0 bg-black/40 transition-opacity data-closed:opacity-0" />
        <div className="fixed inset-0 overflow-hidden">
          <DialogPanel
            transition
            className="flex h-full w-64 flex-col border-r border-black/10 bg-white px-4 pt-4 shadow-xl transition duration-200 ease-out data-closed:-translate-x-full dark:border-white/10 dark:bg-black"
          >
            {sidebarContent(true)}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
