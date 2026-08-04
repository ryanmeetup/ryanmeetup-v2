"use client";

import { useState, type FormEvent } from "react";
import {
  Button,
  ErrorCallout,
  IconButton,
  Input,
  SuccessCallout,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import { FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm({
  email,
  recovery = false,
}: {
  email?: string;
  recovery?: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recovery && (!email || !currentPassword)) {
      setHasError(true);
      setMessage("Enter your current password.");
      return;
    }
    if (password.length < 8) {
      setHasError(true);
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setHasError(true);
      setMessage("Passwords do not match.");
      return;
    }
    setSaving(true);
    setMessage("");
    setHasError(false);
    const supabase = createClient();
    if (!recovery) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email!,
        password: currentPassword,
      });
      if (signInError) {
        setSaving(false);
        setHasError(true);
        setMessage("Current password is incorrect.");
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      const message =
        error.code === "same_password"
          ? "Choose a password you have not used before."
          : "Your password could not be updated. Try again.";
      setHasError(true);
      setMessage(message);
      toast.error(message);
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setConfirmation("");
    setMessage("Password updated.");
    toast.success("Password updated.");
    if (recovery) window.setTimeout(() => { window.location.href = "/"; }, 1200);
  }

  const passwordAction = (
    <Tooltip
      content={showPassword ? "Hide password" : "Show password"}
      placement="left"
    >
      <IconButton
        tooltip={false}
        label={showPassword ? "Hide password" : "Show password"}
        variant="plain"
        onClick={() => setShowPassword((visible) => !visible)}
        aria-pressed={showPassword}
      >
        {showPassword ? <FiEyeOff aria-hidden /> : <FiEye aria-hidden />}
      </IconButton>
    </Tooltip>
  );

  return (
    <form className="space-y-5" onSubmit={submit}>
      {!recovery && (
        <Input
          label="Current password"
          name="current-password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            setMessage("");
            setHasError(false);
          }}
          trailingAction={passwordAction}
        />
      )}
      <Input
        label="New password"
        name="new-password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setMessage("");
          setHasError(false);
        }}
        trailingAction={passwordAction}
      />
      <p className="-mt-3 text-xs text-black/55 dark:text-white/55">
        Use at least 8 characters.
      </p>
      <Input
        label="Confirm new password"
        name="confirm-password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        minLength={8}
        required
        value={confirmation}
        onChange={(event) => {
          setConfirmation(event.target.value);
          setMessage("");
          setHasError(false);
        }}
        trailingAction={passwordAction}
      />
      {hasError ? (
        <ErrorCallout>{message}</ErrorCallout>
      ) : message ? (
        <SuccessCallout>{message}</SuccessCallout>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="submit"
          leftIcon={<FiLock />}
          loading={saving}
          loadingText="Updating..."
        >
          Update password
        </Button>
      </div>
    </form>
  );
}
