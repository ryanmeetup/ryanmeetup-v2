import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { displayNameError, normalizeDisplayName } from "@/lib/display-name";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { displayName, avatarPath } = (await request.json()) as {
    displayName?: string;
    avatarPath?: string;
  };
  const name = normalizeDisplayName(displayName ?? "");
  const validationError = displayNameError(name);
  if (validationError)
    return NextResponse.json({ error: validationError }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json(
      { error: "Profile updates are not configured." },
      { status: 503 },
    );
  const admin = createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (avatarPath !== undefined && avatarPath !== `${auth.user.id}/avatar`)
    return NextResponse.json(
      { error: "The selected avatar is not valid." },
      { status: 400 },
    );
  const avatarUrl = avatarPath
    ? `${admin.storage.from("profile-avatars").getPublicUrl(avatarPath).data.publicUrl}?v=${Date.now()}`
    : undefined;
  const updates: {
    full_name: string;
    onboarding_completed: boolean;
    avatar_url?: string;
  } = { full_name: name, onboarding_completed: true };
  if (avatarUrl) updates.avatar_url = avatarUrl;
  const { data: profile, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", auth.user.id)
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.auth.updateUser({
    data: { full_name: name, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) },
  });
  return NextResponse.json({ profile });
}
