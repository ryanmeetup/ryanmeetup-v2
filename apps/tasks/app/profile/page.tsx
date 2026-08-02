import { redirect } from "next/navigation";
import { Button, Card, Heading } from "@ryanmeetup/ui";
import { FiArrowLeft } from "react-icons/fi";
import { ProfileForm } from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demoMode) redirect("/");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();
  if (error) throw error;
  if (!profile) redirect("/?error=profile");

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-black dark:bg-[#101010] dark:text-white sm:px-6 lg:py-16">
      <div className="mx-auto max-w-2xl">
        <Button.Link href="/" variant="secondary" leftIcon={<FiArrowLeft />}>
          Back to tasks
        </Button.Link>
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
            Your account
          </p>
          <Heading size="h1" className="mt-2 text-4xl">
            Profile
          </Heading>
          <p className="mt-2 text-sm text-black/65 dark:text-white/65">
            Manage how teammates see you across the workspace.
          </p>
        </div>
        <Card className="mt-8">
          <ProfileForm profile={profile} email={auth.user.email ?? ""} />
        </Card>
      </div>
    </main>
  );
}
