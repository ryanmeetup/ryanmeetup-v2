import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadWorkspace,
  WorkspaceLoadError,
  requireQueryData,
  type WorkspaceCollection,
} from "@/lib/server/workspace-loader";

export const isWorkspaceDemo = () =>
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function loadWorkspacePage(
  collections: readonly WorkspaceCollection[],
  {
    owner = false,
    requireOnboarding = true,
  }: { owner?: boolean; requireOnboarding?: boolean } = {},
) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");
  if (owner) {
    const isOwner = requireQueryData(
      "owner access",
      await supabase.rpc("is_app_owner"),
    );
    if (!isOwner) notFound();
  }

  let data;
  try {
    data = await loadWorkspace(supabase, auth.user.id, collections);
  } catch (error) {
    if (error instanceof WorkspaceLoadError) {
      redirect("/profile");
    }
    throw error;
  }

  if (!data) redirect("/login?error=profile");
  if (requireOnboarding && !data.currentProfile.onboarding_completed)
    redirect("/profile");
  return { supabase, user: auth.user, data };
}
