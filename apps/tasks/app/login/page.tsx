import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in · Ryan Meetup",
  description: "Sign in to your Ryan Meetup account.",
};

export default async function LoginPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    redirect("/");
  const { data } = await (await createClient()).auth.getUser();
  if (data.user) redirect("/");
  return <LoginForm />;
}
