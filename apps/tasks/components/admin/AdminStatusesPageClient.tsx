"use client";

import { useState } from "react";
import { FiColumns } from "react-icons/fi";
import { PageHeader } from "@/components/global";
import { StatusSettings } from "@/components/tasks";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { AdminPageShell } from "./AdminPageShell";

export function AdminStatusesPageClient({
  initialData,
  demoMode,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
}) {
  const { data, setData } = useWorkspaceData(initialData, demoMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminPageShell
      data={data}
      demoMode={demoMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      setData={setData}
    >
      <PageHeader
        icon={FiColumns}
        title="Statuses"
        description="The shared task columns, their order, and which ones complete work."
      />
      <StatusSettings data={data} setData={setData} demoMode={demoMode} />
    </AdminPageShell>
  );
}
