"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Heading, Input, Text } from "@ryanmeetup/ui";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const result = password
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
    setLoading(false);
    if (result.error) setMessage(result.error.message);
    else if (password) location.assign("/");
    else setMessage("Magic link sent. Check your inbox to continue.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <Card className="w-full max-w-md" size="lg">
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-black/60 dark:text-white/60">
            Ryan Meetup · Tasks
          </p>
          <Heading size="h1" className="text-3xl">
            Welcome back, Ryan.
          </Heading>
          <Text className="mt-3 text-black/70 dark:text-white/70">
            Sign in with your team email. No public signup, no mystery guests.
          </Text>
        </div>
        <form className="space-y-5" onSubmit={submit}>
          <Input
            label="Email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ryan@example.com"
          />
          <Input
            label="Password (optional)"
            name="password"
            required={false}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Leave blank for a magic link"
          />
          {message && (
            <p
              role="status"
              className="text-sm text-black/70 dark:text-white/70"
            >
              {message}
            </p>
          )}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Signing in…" : password ? "Sign in" : "Send magic link"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
