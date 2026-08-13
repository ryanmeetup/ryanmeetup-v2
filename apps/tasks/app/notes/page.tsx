import type { Metadata } from "next";
import { NotesPageClient } from "@/components/notes";
import { demoData } from "@/lib/demo-data";
import { noteColumns } from "@/lib/notes";
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
      <NotesPageClient initialData={demoData} initialNotes={[]} demoMode />
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
  return (
    <NotesPageClient
      initialData={loaded.data}
      initialNotes={notes}
      demoMode={false}
    />
  );
}
