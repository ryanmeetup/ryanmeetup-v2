import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryEditorPageClient } from "@/components/categories";
import { demoData } from "@/lib/workspace/demo-data";
import {
  editorBackHref,
  redirectAccessPreviewAway,
} from "@/lib/server/editor-page-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("New Work Group") } };
}

/** The mobile create route; `/categories` keeps the dialog for desktop. */
export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/categories");
  redirectAccessPreviewAway(query, backHref);

  if (await isWorkspaceDemo()) {
    return (
      <CategoryEditorPageClient
        initialData={demoData}
        demoMode
        backHref={backHref}
      />
    );
  }

  const { data } = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "categoryOwners",
    "projects",
  ]);
  if (!data.canManageCategories) notFound();
  return (
    <CategoryEditorPageClient
      initialData={data}
      demoMode={false}
      backHref={backHref}
    />
  );
}
