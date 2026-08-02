import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { displayName } = (await request.json()) as {
    displayName?: string;
  };
  const name = displayName?.trim() ?? "";
  if (!name || name.length > 80)
    return NextResponse.json(
      { error: "Display name must be between 1 and 80 characters." },
      { status: 400 },
    );
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
  const { data: profile, error } = await admin
    .from("profiles")
    .update({ full_name: name })
    .eq("id", auth.user.id)
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.auth.updateUser({ data: { full_name: name } });
  return NextResponse.json({ profile });
}
