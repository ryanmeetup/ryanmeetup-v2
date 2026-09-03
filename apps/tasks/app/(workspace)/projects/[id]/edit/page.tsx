import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectEditorPageClient } from "@/components/projects";
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
  return { title: { absolute: await pageTitle("Edit Project") } };
}

/** The mobile edit route; `/projects` keeps the dialog for desktop. */
export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/projects");
  redirectAccessPreviewAway(query, backHref);

  if (await isWorkspaceDemo()) {
    if (!demoData.projects.some((project) => project.id === id)) notFound();
    return (
      <ProjectEditorPageClient
        initialData={demoData}
        demoMode
        projectId={id}
        backHref={backHref}
      />
    );
  }

  const { data } = await loadWorkspacePage([
    "profiles",
    "projects",
    "projectOwners",
    "categories",
    "categoryOwners",
    "statuses",
  ]);
  // RLS decides what came back, so a project missing from the load is one this
  // member cannot reach — the same answer as one that does not exist.
  if (!data.projects.some((project) => project.id === id)) notFound();

  return (
    <ProjectEditorPageClient
      initialData={data}
      demoMode={false}
      projectId={id}
      backHref={backHref}
    />
  );
}
