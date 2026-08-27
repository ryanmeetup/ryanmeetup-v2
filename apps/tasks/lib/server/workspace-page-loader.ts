import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  loadWorkspace,
  WorkspaceLoadError,
  requireQueryData,
  type WorkspaceCollection,
} from "@/lib/server/workspace-loader";
import { isDemoBuild } from "@/lib/instance";
import { DEMO_PREVIEW_COOKIE, DEMO_PREVIEW_VALUE } from "@/lib/demo-preview";
import { seedDefaultStatusesIfEmpty } from "@/lib/server/default-statuses";

/**
 * Whether this request renders the demo workspace, either because the build
 * has no Supabase credentials at all or because an app owner turned on demo
 * preview. Cached so the pages, the layout, and the branding resolver share one
 * answer — and one ownership check — per request.
 *
 * The cookie is never trusted on its own. Demo mode swaps the whole
 * database-backed workspace for fixtures, so a forged cookie leaks nothing, but
 * it would still walk an anonymous visitor past the login redirect into a
 * plausible-looking workspace. `is_app_owner` decides instead, and it fails
 * closed: any error, or any non-owner, gets the real app.
 */
export const isWorkspaceDemo = cache(async (): Promise<boolean> => {
  if (isDemoBuild) return true;
  const requested =
    (await cookies()).get(DEMO_PREVIEW_COOKIE)?.value === DEMO_PREVIEW_VALUE;
  if (!requested) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_app_owner");
  return !error && data === true;
});

export async function loadWorkspacePage(
  collections: readonly WorkspaceCollection[],
  {
    owner = false,
    requireOnboarding = true,
    onLoadError = "redirect",
  }: {
    owner?: boolean;
    requireOnboarding?: boolean;
    /**
     * How to handle a failed workspace query. The default sends the visitor to
     * /profile, which can recover with a minimal profile — but /profile itself
     * must pass "throw", or the redirect points at the failing page and loops.
     */
    onLoadError?: "redirect" | "throw";
  } = {},
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
    if (
      data &&
      collections.includes("statuses") &&
      data.statuses.length === 0
    ) {
      await seedDefaultStatusesIfEmpty();
      data = await loadWorkspace(supabase, auth.user.id, collections);
    }
  } catch (error) {
    if (error instanceof WorkspaceLoadError && onLoadError === "redirect") {
      redirect("/profile");
    }
    throw error;
  }

  if (!data) redirect("/login?error=profile");
  if (requireOnboarding && !data.currentProfile.onboarding_completed)
    redirect("/profile");
  return { supabase, user: auth.user, data };
}
