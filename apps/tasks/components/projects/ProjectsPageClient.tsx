"use client";

import { useState } from "react";
import { IconButton } from "@ryanmeetup/ui";
import { FiSidebar } from "react-icons/fi";
import { ProjectsModal } from "./ProjectsModal";
import { CategoriesModal } from "@/components/categories";
import { TaskBanners } from "@/components/global";
import {
  TaskHeaderActions,
  TaskHeaderBrand,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import type { WorkspaceData } from "@/lib/types";

export function ProjectsPageClient({
  initialData,
  demoMode,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={demoMode}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryCreateOpen(true)}
        onCreateProject={() => setCreateOpen(true)}
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
          />
        </header>
        <TaskBanners preview={data.accessPreview} />

        <div className="p-3 sm:p-6 lg:p-6 xl:p-8">
          <ProjectsModal
            open
            setOpen={() => undefined}
            data={data}
            setData={setData}
            demoMode={demoMode}
            embedded
            showOwnerNames
            readOnly={Boolean(data.accessPreview)}
            onCreate={() => setCreateOpen(true)}
          />
        </div>
      </main>

      {createOpen && !data.accessPreview && (
        <ProjectsModal
          open={createOpen}
          setOpen={setCreateOpen}
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
