"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { WorkspacePageShell } from "@/components/global";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { AdminNav } from "./AdminNav";

/**
 * Layout for every owner-only admin screen. Page padding, content width, and
 * the tab strip live here so moving between admin tabs never shifts the page;
 * each admin client owns its content only. Drill-down screens below a tab pass
 * `nav={false}` and lead with their own breadcrumbs.
 */
export function AdminPageShell({
  children,
  data,
  demoMode,
  nav = true,
  onCreateCategory,
  onCreateProject,
  setData,
  setSidebarOpen,
  sidebarOpen,
}: {
  children: ReactNode;
  data: WorkspaceData;
  demoMode: boolean;
  nav?: boolean;
  onCreateCategory?: () => void;
  onCreateProject?: () => void;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
}) {
  return (
    <WorkspacePageShell
      data={data}
      demoMode={demoMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      onCreateCategory={onCreateCategory}
      onCreateProject={onCreateProject}
      setData={setData}
      contentClassName="p-4 sm:p-6 lg:p-8"
    >
      <div className="mx-auto max-w-7xl space-y-8">
        {nav && <AdminNav />}
        {children}
      </div>
    </WorkspacePageShell>
  );
}
