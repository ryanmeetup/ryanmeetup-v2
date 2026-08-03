"use client";

import Link from "next/link";
import { Avatar, IconButton, Pill, Tooltip } from "@ryanmeetup/ui";
import {
  FiCalendar,
  FiFolder,
  FiGrid,
  FiList,
  FiLogOut,
  FiPlus,
  FiSettings,
  FiUser,
  FiX,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import type { WorkspaceData } from "@/lib/types";

export function TasksSidebar({
  data,
  demoMode,
  open,
  setOpen,
  onCreateCategory,
  onCreateProject,
  onTeamSettings,
}: {
  data: WorkspaceData;
  demoMode: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreateCategory: () => void;
  onCreateProject: () => void;
  onTeamSettings: () => void;
}) {
  const name = data.currentProfile.full_name || "Teammate";
  const activeProjects = data.projects.filter((project) => !project.archived_at);

  return (
    <>
      {open && (
        <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-black/10 bg-white p-4 transition-transform dark:border-white/10 dark:bg-black lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 items-center justify-between px-2">
          <Link href="/" aria-label="Task tracker home" className="-ml-2 rounded-lg px-2 py-1 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 motion-reduce:transform-none dark:hover:bg-white/10 dark:focus-visible:ring-white/40">
            <p className="font-cooper text-2xl uppercase">Ryan Meetup</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">Task tracker</p>
          </Link>
          <IconButton label="Close navigation" className="lg:hidden" onClick={() => setOpen(false)}><FiX /></IconButton>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Main navigation">
          <Link href={`/?assignee=${encodeURIComponent(name)}&view=list`} className="sidebar-link"><FiUser />My Tasks</Link>
          <Link href="/?view=board" className="sidebar-link"><FiGrid />Board</Link>
          <Link href="/?view=list" className="sidebar-link"><FiList />List</Link>
          <Tooltip content="Calendar view is coming soon" placement="right" triggerClassName="w-full">
            <button disabled className="sidebar-link opacity-40"><FiCalendar />Calendar<Pill size="sm" className="ml-auto">Soon</Pill></button>
          </Tooltip>
        </nav>
        <div className="mt-8 flex min-h-0 flex-1 flex-col">
          <section className="flex max-h-[70%] min-h-0 shrink-0 flex-col overflow-hidden border-b border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">Categories</p>
              <span className="flex items-center gap-1"><Link href="/categories" className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">Manage</Link><IconButton label="Create category" size="sm" onClick={onCreateCategory}><FiPlus /></IconButton></span>
            </div>
            <div className="mt-2 min-h-0 flex-1 scroll-pb-2 space-y-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
              {data.categories.map((category) => <Link key={category.id} href={`/?category=${encodeURIComponent(category.name)}`} className="sidebar-link"><span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} /><span className="truncate">{category.name}</span></Link>)}
            </div>
          </section>
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">Projects</p>
              <span className="flex items-center gap-1"><Link href="/projects" className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">Manage</Link><IconButton label="Create project" size="sm" onClick={onCreateProject}><FiPlus /></IconButton></span>
            </div>
            <div className="mt-2 min-h-0 flex-1 scroll-pb-2 space-y-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
              {activeProjects.map((project) => <Link key={project.id} href={`/?project=${encodeURIComponent(project.name)}`} className="sidebar-link"><FiFolder className="shrink-0" /><span className="truncate">{project.name}</span></Link>)}
            </div>
          </section>
        </div>
        <div className="shrink-0 space-y-2 border-t border-black/10 pt-4 dark:border-white/10">
          <button className="sidebar-link" onClick={onTeamSettings}><FiSettings />Team settings</button>
          <div className="flex items-center gap-3 px-2 py-2">
            {demoMode ? <div className="flex min-w-0 flex-1 items-center gap-3"><Avatar name={name} src={data.currentProfile.avatar_url} /><ProfileSummary name={name} demo /></div> : <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40"><Avatar name={name} src={data.currentProfile.avatar_url} /><ProfileSummary name={name} /></Link>}
            {!demoMode && <Tooltip content="Sign out" placement="right"><IconButton label="Sign out" onClick={async () => { await createClient().auth.signOut(); location.assign("/login"); }}><FiLogOut /></IconButton></Tooltip>}
          </div>
        </div>
      </aside>
    </>
  );
}

function ProfileSummary({ name, demo = false }: { name: string; demo?: boolean }) {
  return <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{name}</span><span className="block text-[10px] uppercase tracking-widest text-black/45 dark:text-white/45">Team member{demo ? " · Demo" : ""}</span></span>;
}
