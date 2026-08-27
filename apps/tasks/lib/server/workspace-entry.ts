import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceLoadError } from "@/lib/server/workspace-loader";
import {
  safeWorkspaceReturnPath,
  workspaceEntryRedirect,
} from "@/lib/workspace/entry-route";

export const requireWorkspaceUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return data.user;
});

const workspaceEntry = cache(async () => {
  const user = await requireWorkspaceUser();
  const supabase = await createClient();
  const result = await supabase
    .from("profiles")
    .select("id,onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (result.error)
    throw new WorkspaceLoadError("workspace entry", result.error);
  return { profile: result.data, user };
});

async function requestedWorkspacePath() {
  return safeWorkspaceReturnPath((await headers()).get("x-tasks-path"));
}

/**
 * Resolve identity and onboarding before any broad workspace query runs.
 * Missing profiles, incomplete onboarding, and data failures are distinct
 * states and must never be translated into one another.
 */
export async function requireWorkspaceEntry({
  allowIncomplete = false,
}: { allowIncomplete?: boolean } = {}) {
  const entry = await workspaceEntry();
  const destination = workspaceEntryRedirect({
    allowIncomplete,
    hasProfile: Boolean(entry.profile),
    onboardingCompleted: Boolean(entry.profile?.onboarding_completed),
    returnTo: await requestedWorkspacePath(),
  });
  if (destination) redirect(destination);
  return { ...entry, profile: entry.profile };
}
