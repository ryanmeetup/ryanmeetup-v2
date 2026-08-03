"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Button,
  ErrorCallout,
  Input,
  SuccessCallout,
  toast,
} from "@ryanmeetup/ui";
import { FiSave } from "react-icons/fi";
import type { Profile } from "@/lib/types";
import { displayNameError, normalizeDisplayName } from "@/lib/display-name";
import { createClient } from "@/lib/supabase/client";

const avatarTypes = ["image/jpeg", "image/png", "image/webp"];
const maxAvatarSize = 5 * 1024 * 1024;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileForm({
  profile,
  email,
  onboardingRequired,
}: {
  profile: Profile;
  email: string;
  onboardingRequired: boolean;
}) {
  const [displayName, setDisplayName] = useState(profile.full_name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url);

  useEffect(
    () => () => {
      if (avatarPreview?.startsWith("blob:"))
        URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!avatarTypes.includes(file.type) || file.size > maxAvatarSize) {
      const errorMessage =
        "Choose a JPG, PNG, or WebP image that is 5 MB or smaller.";
      setMessage(errorMessage);
      setHasError(true);
      event.target.value = "";
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setMessage("");
    setHasError(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setHasError(false);
    const normalizedName = normalizeDisplayName(displayName);
    const validationError = displayNameError(normalizedName);
    if (validationError) {
      setMessage(validationError);
      setHasError(true);
      setSaving(false);
      return;
    }
    try {
      let avatarPath: string | undefined;
      if (avatarFile) {
        avatarPath = `${profile.id}/avatar`;
        const { error: uploadError } = await createClient()
          .storage.from("profile-avatars")
          .upload(avatarPath, avatarFile, {
            cacheControl: "3600",
            contentType: avatarFile.type,
            upsert: true,
          });
        if (uploadError) throw uploadError;
      }
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: normalizedName, avatarPath }),
      });
      const result = (await response.json()) as {
        error?: string;
        profile?: Profile;
      };
      if (!response.ok || !result.profile)
        throw new Error(result.error ?? "Your profile could not be saved.");
      setDisplayName(result.profile.full_name || "");
      setAvatarFile(null);
      setAvatarPreview(result.profile.avatar_url);
      if (onboardingRequired) {
        window.location.assign("/");
        return;
      }
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
      <div className="flex items-center gap-4">
        <div
          role="img"
          aria-label={
            avatarPreview ? "Profile photo preview" : "Profile initials"
          }
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/5 bg-cover bg-center text-xl font-semibold text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70"
          style={
            avatarPreview
              ? { backgroundImage: `url(${JSON.stringify(avatarPreview)})` }
              : undefined
          }
        >
          {!avatarPreview && initials(displayName || profile.full_name)}
        </div>
        <div>
          <label
            htmlFor="profile-avatar"
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-black/20 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:border-black/40 hover:bg-black/5 focus-within:ring-2 focus-within:ring-black/30 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/10 dark:focus-within:ring-white/30"
          >
            {avatarPreview ? "Change photo" : "Upload photo"}
            <input
              id="profile-avatar"
              name="profile-avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={saving}
              onChange={selectAvatar}
            />
          </label>
          <p className="mt-2 text-xs text-black/55 dark:text-white/55">
            Optional · JPG, PNG, or WebP · 5 MB maximum
          </p>
        </div>
      </div>
      <Input
        label="Display name"
        name="display-name"
        required
        maxLength={80}
        autoComplete="name"
        autoFocus={onboardingRequired}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="First and last name"
      />
      <p className="-mt-3 text-xs text-black/55 dark:text-white/55">
        Use your first and last name. This is how you appear on tasks, comments,
        and projects.
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
        <Button
          type="submit"
          leftIcon={<FiSave />}
          loading={saving}
          loadingText="Saving..."
        >
          {onboardingRequired ? "Continue to tasks" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
