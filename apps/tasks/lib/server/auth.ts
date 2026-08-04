import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { apiError, authRequired, forbidden } from "./api-response";

type ApiFailure = { response: ReturnType<typeof apiError> };
export type Authorization = { user: User; supabase: SupabaseClient };

export async function authorize({
  owner = false,
  onboarded = false,
}: { owner?: boolean; onboarded?: boolean } = {}): Promise<
  ApiFailure | Authorization
> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      response: apiError(
        503,
        "SERVICE_UNAVAILABLE",
        "Authentication is temporarily unavailable.",
      ),
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { response: authRequired() };
  if (onboarded) {
    const profile = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile.error || !profile.data?.onboarding_completed)
      return { response: forbidden() };
  }
  if (owner) {
    const { data: isOwner, error: ownerError } =
      await supabase.rpc("is_app_owner");
    if (ownerError || !isOwner) return { response: forbidden() };
  }
  return { user: data.user, supabase };
}
