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
        description="The shared task columns, their order, which ones complete work, and which ones require a reason."
      />
      <StatusSettings
        statuses={data.statuses}
        demoMode={demoMode}
        onStatusesChange={(update) =>
          setData((current) => ({
            ...current,
            statuses: update(current.statuses),
          }))
        }
        onStatusCompletionChange={(id, isCompleted) => {
          const now = new Date().toISOString();
          const archiveDelayMs = 14 * 24 * 60 * 60 * 1000;
          setData((current) => ({
            ...current,
            statuses: current.statuses.map((status) =>
              status.id === id
                ? { ...status, is_completed: isCompleted }
                : status,
            ),
            tasks: current.tasks.map((task) => {
              if (task.status_id !== id) return task;
              return {
                ...task,
                ...(isCompleted
                  ? {
                      completed_at: task.completed_at ?? now,
                      archived_at:
                        task.archived_at ??
                        new Date(
                          new Date(now).getTime() + archiveDelayMs,
                        ).toISOString(),
                    }
                  : { completed_at: null, archived_at: null }),
              };
            }),
          }));
        }}
      />
    </AdminPageShell>
  );
}
