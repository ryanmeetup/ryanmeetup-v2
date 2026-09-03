import type { Metadata } from "next";
import { NewTaskPageClient } from "@/components/tasks";
import { demoData } from "@/lib/workspace/demo-data";
import {
  editorBackHref,
  EDITOR_COLLECTIONS,
  redirectAccessPreviewAway,
} from "@/lib/server/editor-page-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("New Task") } };
}

/**
 * The mobile create route. The board's dialog covers desktop; this exists so a
 * phone gets the whole viewport for the form. It loads only the reference
 * collections the form reads — no tasks, since a new one has no history.
 */
export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/board");
  redirectAccessPreviewAway(query, backHref);

  if (await isWorkspaceDemo()) {
    return (
      <NewTaskPageClient initialData={demoData} demoMode backHref={backHref} />
    );
  }

  const { data } = await loadWorkspacePage([...EDITOR_COLLECTIONS]);
  return (
    <NewTaskPageClient
      initialData={data}
      demoMode={false}
      backHref={backHref}
    />
  );
}
