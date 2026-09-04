"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  editorPageContentClassName,
  WorkspacePageShell,
} from "@/components/global";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { ProjectsModal } from "./ProjectsModal";

/**
 * `/projects/new` and `/projects/[id]/edit` — the project editor as a page.
 *
 * `ProjectsModal` already renders exactly one surface when it is given
 * `createOnly` or `editProjectId`, so the route mounts it with the same options
 * the dialog uses and only changes the presentation. The form and its mutations
 * are shared; the chrome around them is not — `presentation: "page"` swaps the
 * dialog for a titled page in a breadcrumb trail.
 */
export function ProjectEditorPageClient({
  initialData,
  demoMode,
  projectId,
  backHref,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  /** Omitted for the create route. */
  projectId?: string;
  backHref: string;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  return (
    <WorkspacePageShell
      data={data}
      demoMode={demoMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      setData={setData}
      contentClassName={editorPageContentClassName}
    >
      <ProjectsModal
        workspace={{ data, setData, demoMode }}
        modal={{
          open: true,
          // Saving and cancelling both close the editor; on a route that is a
          // navigation back to where the author came from.
          setOpen: (open) => {
            if (!open) router.push(backHref);
          },
        }}
        options={{
          presentation: "page",
          ...(projectId ? { editProjectId: projectId } : { createOnly: true }),
        }}
      />
    </WorkspacePageShell>
  );
}
