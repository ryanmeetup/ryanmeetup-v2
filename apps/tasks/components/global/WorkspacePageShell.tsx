"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { IconButton } from "@ryanmeetup/ui";
import { FiSidebar } from "react-icons/fi";
import type { WorkspaceData } from "@/lib/workspace-types";
import {
  TaskHeaderActions,
  TaskHeaderBrand,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import { TaskBanners } from "./TaskBanners";

export function WorkspacePageShell({
  children,
  contentClassName,
  data,
  demoMode,
  onCreateCategory,
  onCreateProject,
  onNewTask,
  setData,
  setSidebarOpen,
  sidebarOpen,
}: {
  children: ReactNode;
  contentClassName?: string;
  data: WorkspaceData;
  demoMode: boolean;
  onCreateCategory?: () => void;
  onCreateProject?: () => void;
  onNewTask?: () => void;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={demoMode}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={onCreateCategory ?? (() => undefined)}
        onCreateProject={onCreateProject ?? (() => undefined)}
      />
      <main className="min-w-0 overflow-x-hidden lg:pl-64">
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
            onNewTask={onNewTask}
          />
        </header>
        <TaskBanners preview={data.accessPreview} />
        <div className={contentClassName}>{children}</div>
      </main>
    </div>
  );
}
