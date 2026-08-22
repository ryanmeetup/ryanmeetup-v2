import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Heading } from "@ryanmeetup/ui";
import { PasswordForm } from "@/components/auth";
import { ThemeToggle } from "@/components/global";
import { createClient } from "@/lib/supabase/server";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Reset Password") } };
}

export default async function ResetPasswordPage() {
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) redirect("/login?recovery=invalid");
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="fixed right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle /></div>
      <Card className="w-full max-w-lg" size="lg">
        <Heading size="h1" className="text-3xl">Choose a new password</Heading>
        <p className="mt-3 text-sm text-black/65 dark:text-white/65">Enter and confirm the new password for your account.</p>
        <div className="mt-6"><PasswordForm recovery /></div>
      </Card>
    </main>
  );
}
