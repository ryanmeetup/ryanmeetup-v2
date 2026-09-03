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
  return { title: { absolute: await pageTitle("Edit Work Group") } };
}

/** The mobile edit route; `/categories` keeps the dialog for desktop. */
export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/categories");
  redirectAccessPreviewAway(query, backHref);

  if (await isWorkspaceDemo()) {
    if (!demoData.categories.some((category) => category.id === id))
      notFound();
    return (
      <CategoryEditorPageClient
        initialData={demoData}
        demoMode
        categoryId={id}
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
  // RLS decides what came back, so a category missing from the load is one this
  // member cannot reach — the same answer as one that does not exist.
  if (!data.categories.some((category) => category.id === id)) notFound();

  return (
    <CategoryEditorPageClient
      initialData={data}
      demoMode={false}
      categoryId={id}
      backHref={backHref}
    />
  );
}
