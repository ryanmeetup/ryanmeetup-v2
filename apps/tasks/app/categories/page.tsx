import { CategoriesPageClient } from "@/components/categories";
import { demoData } from "@/lib/demo-data";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work Groups",
};

export default async function CategoriesPage() {
  const demoMode = isWorkspaceDemo();
  if (demoMode) return <CategoriesPageClient initialData={demoData} demoMode />;

  const { data: initialData } = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "projects",
  ]);
  return <CategoriesPageClient initialData={initialData} demoMode={false} />;
}
