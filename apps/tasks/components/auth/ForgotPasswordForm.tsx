"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Heading, Input, SuccessCallout } from "@ryanmeetup/ui";
import Link from "next/link";
import { tasksAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/global";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: tasksAppUrl(
        "/auth/callback?next=/reset-password",
        window.location.origin,
      ),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="fixed right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle /></div>
      <Card className="w-full max-w-lg" size="lg">
        <Heading size="h1" className="text-3xl">Reset your password</Heading>
        <p className="mt-3 text-sm text-black/65 dark:text-white/65">Enter your account email and we’ll send you a secure reset link.</p>
        {sent ? (
          <div className="mt-6 space-y-5">
            <SuccessCallout>If an account exists for that email, a reset link is on its way.</SuccessCallout>
            <Link href="/login" className="inline-block text-sm font-semibold underline underline-offset-4">Back to sign in</Link>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            <Button type="submit" size="md" fullWidth loading={loading} loadingText="Sending link...">Send reset link</Button>
            <p className="text-center"><Link href="/login" className="text-sm font-semibold underline-offset-4 hover:underline">Back to sign in</Link></p>
          </form>
        )}
      </Card>
    </main>
  );
}
