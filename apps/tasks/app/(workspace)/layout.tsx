import type { ReactNode } from "react";
import { PersistentWorkspaceShell } from "@/components/global";
import { demoData } from "@/lib/workspace/demo-data";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";

const shellCollections = [
  "profiles",
  "statuses",
  "categories",
  "categoryOwners",
  "projects",
  "projectOwners",
  "tasks",
] as const;

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const demoMode = await isWorkspaceDemo();
  const initialData = demoMode
    ? demoData
    : (await loadWorkspacePage(shellCollections)).data;

  return (
    <PersistentWorkspaceShell initialData={initialData} demoMode={demoMode}>
      {children}
    </PersistentWorkspaceShell>
  );
}
