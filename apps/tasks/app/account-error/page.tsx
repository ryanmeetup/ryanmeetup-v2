import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountProvisioningError } from "@/components/auth";
import { pageTitle } from "@/lib/server/instance-settings";
import { requireWorkspaceUser } from "@/lib/server/workspace-entry";
import { WorkspaceLoadError } from "@/lib/server/workspace-loader";
import { createClient } from "@/lib/supabase/server";
import { onboardingHref } from "@/lib/workspace/entry-route";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Account setup") } };
}

export default async function AccountErrorPage() {
  const user = await requireWorkspaceUser();
  const result = await (await createClient())
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (result.error)
    throw new WorkspaceLoadError("account provisioning", result.error);
  if (result.data?.onboarding_completed) redirect("/");
  if (result.data) redirect(onboardingHref("/"));
  return <AccountProvisioningError />;
}
