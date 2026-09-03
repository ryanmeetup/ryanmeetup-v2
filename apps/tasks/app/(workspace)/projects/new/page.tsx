import type { Metadata } from "next";
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
  return { title: { absolute: await pageTitle("New Project") } };
}

/** The mobile create route; `/projects` keeps the dialog for desktop. */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/projects");
  redirectAccessPreviewAway(query, backHref);

  if (await isWorkspaceDemo()) {
    return (
      <ProjectEditorPageClient
        initialData={demoData}
        demoMode
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
  return (
    <ProjectEditorPageClient
      initialData={data}
      demoMode={false}
      backHref={backHref}
    />
  );
}
