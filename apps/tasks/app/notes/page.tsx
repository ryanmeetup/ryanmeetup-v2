import type { Metadata } from "next";
import { NotesPageClient } from "@/components/notes";
import { demoData } from "@/lib/demo-data";
import { noteColumns, noteCommentColumns } from "@/lib/notes";
import { requireQueryData } from "@/lib/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";

export const metadata: Metadata = {
  title: { absolute: "Notes | Ryan Meetup Tasks" },
};

export default async function NotesPage() {
  const demoMode = isWorkspaceDemo();
  if (demoMode)
    return (
      <NotesPageClient
        initialData={demoData}
        initialNotes={[]}
        initialComments={[]}
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
  const notes = requireQueryData(
    "notes",
    await loaded.supabase
      .from("notes")
      .select(noteColumns)
      .order("updated_at", { ascending: false }),
  );
  const comments = requireQueryData(
    "note comments",
    await loaded.supabase
      .from("note_comments")
      .select(noteCommentColumns)
      .order("created_at", { ascending: true }),
  );
  return (
    <NotesPageClient
      initialData={loaded.data}
      initialNotes={notes}
      initialComments={comments}
      demoMode={false}
    />
  );
}
