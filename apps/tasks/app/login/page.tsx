import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Sign In") } };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    redirect("/");
  const error = (await searchParams).error;
  const notice =
    error === "profile"
      ? "Your account has no workspace profile yet. Ask an owner to add you, or sign in with another account."
      : "";
  const { data } = await (await createClient()).auth.getUser();
  // A signed-in visitor normally belongs on the dashboard, but bouncing them
  // there when they arrived with an error would loop straight back to here.
  if (data.user && !notice) redirect("/");
  return <LoginForm notice={notice} />;
}
