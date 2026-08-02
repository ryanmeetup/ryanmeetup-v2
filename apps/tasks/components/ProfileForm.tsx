"use client";

import { useState, type FormEvent } from "react";
import {
  Button,
  ErrorCallout,
  Input,
  SuccessCallout,
  toast,
} from "@ryanmeetup/ui";
import { FiSave } from "react-icons/fi";
import type { Profile } from "@/lib/types";

export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const [displayName, setDisplayName] = useState(profile.full_name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setHasError(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const result = (await response.json()) as {
        error?: string;
        profile?: Profile;
      };
      if (!response.ok || !result.profile)
        throw new Error(result.error ?? "Your profile could not be saved.");
      setDisplayName(result.profile.full_name || "");
      setMessage("Profile saved.");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Your profile could not be saved.";
      setMessage(errorMessage);
      setHasError(true);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={save}>
      <Input
        label="Display name"
        name="display-name"
        required
        maxLength={80}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
      />
      <p className="-mt-3 text-xs text-black/55 dark:text-white/55">
        This is how your name appears on tasks, comments, and projects.
      </p>
      <Input
        label="Email"
        name="profile-email"
        type="email"
        value={email}
        readOnly
        onChange={() => undefined}
        inputClassName="cursor-default bg-black/[0.035] text-black/65 dark:bg-white/[0.035] dark:text-white/65"
      />
      <p className="-mt-3 text-xs text-black/55 dark:text-white/55">
        Your sign-in email cannot be changed here.
      </p>
      {hasError ? (
        <ErrorCallout>{message}</ErrorCallout>
      ) : message ? (
        <SuccessCallout>{message}</SuccessCallout>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" leftIcon={<FiSave />} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
