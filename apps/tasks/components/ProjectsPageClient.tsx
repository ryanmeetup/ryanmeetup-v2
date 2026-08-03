"use client";

import { useState } from "react";
import { IconButton } from "@ryanmeetup/ui";
import { FiMenu } from "react-icons/fi";
import { ProjectsModal } from "./ProjectsModal";
import { WorkGroupsModal as CategoriesModal } from "./WorkGroupsModal";
import { TaskHeaderActions } from "./TaskHeaderActions";
import { TaskBanners } from "./TaskBanners";
import { TasksSidebar } from "./TasksSidebar";
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

      <main className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/10 bg-[#f7f7f5]/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#101010]/90 sm:px-6 lg:px-8">
          <IconButton
            label="Open navigation"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu />
          </IconButton>
          <p className="font-semibold">Projects</p>
          <TaskHeaderActions data={data} demoMode={demoMode} />
        </header>
        <TaskBanners preview={data.accessPreview} />

        <div className="p-4 sm:p-6 lg:p-8">
          <ProjectsModal
            open
            setOpen={() => undefined}
            data={data}
            setData={setData}
            demoMode={demoMode}
            embedded
            readOnly={Boolean(data.accessPreview)}
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
