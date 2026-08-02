"use client";

import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  FieldError,
  Heading,
  IconButton,
  Input,
  Tooltip,
} from "@ryanmeetup/ui";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./ThemeToggle";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missingEmail = !email.trim();
    const missingPassword = !password;
    setEmailError(missingEmail);
    setPasswordError(missingPassword);
    if (missingEmail || missingPassword) {
      setMessage(
        missingEmail && missingPassword
          ? "Error: username and password are required"
          : missingEmail
            ? "Error: username is required"
            : "Error: password is required",
      );
      return;
    }
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      setEmailError(true);
      setPasswordError(true);
      setMessage("Error: username or password is incorrect");
    } else location.assign("/");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="fixed right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-lg" size="lg">
        <div className="mb-8">
          <Heading
            size="h1"
            className="mb-6 whitespace-nowrap text-center text-3xl uppercase tracking-[0.08em] sm:text-5xl"
          >
            Ryan Meetup
          </Heading>
        </div>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <Input
            label="Username"
            name="email"
            type="email"
            required
            value={email}
            error={emailError}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(false);
              setMessage("");
            }}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            error={passwordError}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError(false);
              setMessage("");
            }}
            placeholder="Enter your password"
            trailingAction={
              <Tooltip
                content={showPassword ? "Hide password" : "Show password"}
                placement="left"
              >
                <IconButton
                  label={showPassword ? "Hide password" : "Show password"}
                  variant="plain"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <FiEyeOff aria-hidden />
                  ) : (
                    <FiEye aria-hidden />
                  )}
                </IconButton>
              </Tooltip>
            }
          />
          <FieldError>{message}</FieldError>
          <Button
            type="submit"
            fullWidth
            loading={loading}
            loadingText="Signing in..."
          >
            Sign in
          </Button>
        </form>
      </Card>
    </main>
  );
}
