import type { Metadata } from "next";
import { NotesPageClient } from "@/components/notes";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  notesForPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access/access-preview";
import { resolveAccessPreview } from "@/lib/server/access-preview";
import {
  demoData,
  demoNoteComments,
  demoNotes,
} from "@/lib/workspace/demo-data";
import { noteColumns, noteCommentColumns } from "@/lib/resources/notes";
import { requireQueryData } from "@/lib/server/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Notes") } };
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestedGroupPreview =
    typeof query[ACCESS_PREVIEW_PARAM] === "string"
      ? query[ACCESS_PREVIEW_PARAM]
      : undefined;
  const requestedUserPreview =
    typeof query[USER_ACCESS_PREVIEW_PARAM] === "string"
      ? query[USER_ACCESS_PREVIEW_PARAM]
      : undefined;
  const demoMode = await isWorkspaceDemo();
  if (demoMode)
    return (
      <NotesPageClient
        initialData={demoData}
        initialNotes={demoNotes}
        initialComments={demoNoteComments}
        demoMode
      />
    );
  const loaded = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "projects",
    "tasks",
    "taskCategories",
  ]);
  let initialData = loaded.data;
  let notes = requireQueryData(
    "notes",
    await loaded.supabase
      .from("notes")
      .select(noteColumns)
      .order("updated_at", { ascending: false }),
  );
  let comments = requireQueryData(
    "note comments",
    await loaded.supabase
      .from("note_comments")
      .select(noteCommentColumns)
      .order("created_at", { ascending: true }),
  );
  if (requestedGroupPreview || requestedUserPreview) {
    const isOwner = requireQueryData(
      "owner access",
      await loaded.supabase.rpc("is_app_owner"),
    );
    if (isOwner) {
      const resolvedPreview = await resolveAccessPreview(loaded.supabase, {
        groupId: requestedGroupPreview,
        userName: requestedUserPreview,
        allProjectIds: initialData.projects.map((project) => project.id),
      });
      if (resolvedPreview) {
        initialData = applyAccessPreview(
          initialData,
          resolvedPreview.preview,
          resolvedPreview.projectIds,
        );
        notes = notesForPreview(notes, resolvedPreview.preview);
        const visibleNoteIds = new Set(notes.map((note) => note.id));
        comments = comments.filter((comment) =>
          visibleNoteIds.has(comment.note_id),
        );
      }
    }
  }
  return (
    <NotesPageClient
      initialData={initialData}
      initialNotes={notes}
      initialComments={comments}
      demoMode={false}
    />
  );
}
