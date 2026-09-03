"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  wideEditorPageContentClassName,
  WorkspacePageShell,
} from "@/components/global";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { CategoriesModal } from "./CategoriesModal";
import { categoryController } from "./category-workspace";

/**
 * `/categories/new` and `/categories/[id]/edit` — the category editor as a
 * page. Like the project routes, this mounts the existing editor with the
 * options the dialog uses and only changes the presentation.
 */
export function CategoryEditorPageClient({
  initialData,
  demoMode,
  categoryId,
  backHref,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  /** Omitted for the create route. */
  categoryId?: string;
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
      contentClassName={wideEditorPageContentClassName}
    >
      <CategoriesModal
        controller={categoryController(data, setData, demoMode)}
        modal={{
          open: true,
          setOpen: (open) => {
            if (!open) router.push(backHref);
          },
        }}
        options={{
          presentation: "page",
          backHref,
          ...(categoryId
            ? { editCategoryId: categoryId }
            : { createOnly: true }),
        }}
      />
    </WorkspacePageShell>
  );
}
