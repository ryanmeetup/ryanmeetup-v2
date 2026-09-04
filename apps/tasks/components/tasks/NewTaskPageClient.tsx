"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  editorPageContentClassName,
  WorkspacePageShell,
} from "@/components/global";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { taskPath } from "@/lib/tasks/task-key";
import type { Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { NewTaskModal } from "./NewTaskModal";
import { BOARD_CRUMB } from "./task-crumbs";

/**
 * `/task/new` — the create flow as its own screen, for phones where the dialog
 * leaves too little room to fill the form in. The desktop dialog is unchanged
 * and this route shares its entire form; only the surface around it differs —
 * a breadcrumb trail and a page heading in place of the dialog's chrome.
 */
export function NewTaskPageClient({
  initialData,
  demoMode,
  backHref,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  backHref: string;
}) {
  const { data, setData } = useWorkspaceData(initialData, demoMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  /**
   * Where a finished form goes. `NewTaskModal` only closes when the author is
   * not creating another, so leaving the navigation to the close keeps "Create
   * another" on the page for the next task.
   */
  const created = useRef<Task | null>(null);

  return (
    <WorkspacePageShell
      data={data}
      demoMode={demoMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      setData={setData}
      contentClassName={editorPageContentClassName}
    >
      <NewTaskModal
        presentation="page"
        parents={[BOARD_CRUMB]}
        data={data}
        demoMode={demoMode}
        open
        setData={setData}
        setOpen={(next) => {
          if (next) return;
          router.push(created.current ? taskPath(created.current) : backHref);
        }}
        onCreated={(task) => {
          created.current = task;
        }}
      />
    </WorkspacePageShell>
  );
}
