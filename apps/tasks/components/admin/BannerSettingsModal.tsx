"use client";

import { useState } from "react";
import { Button, Input, Modal } from "@ryanmeetup/ui";
import { useInstanceSettingsForm } from "@/hooks/useInstanceSettingsForm";
import {
  isFeedbackHref,
  resolveInstanceSettings,
  type InstanceSettings,
  type InstanceSettingsOverrides,
} from "@/lib/instance";
import { BetaBannerPreview } from "./BetaBannerPreview";

const FORM_ID = "instance-banner-form";

/** The checkbox card the settings dialogs use for a plain on/off choice. */
function SwitchField({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-black/30 accent-black dark:border-white/30 dark:accent-white"
      />
      <span>
        <span className="font-semibold">{label}</span>
        <span className="mt-1 block text-black/60 dark:text-white/60">
          {description}
        </span>
      </span>
    </label>
  );
}

/**
 * Every control here is seeded from the resolved setting rather than from the
 * stored override, because none of these values has a blank state that means
 * "inherit": an unticked box and an empty link are choices in their own right.
 * Only values that actually change are written, so an untouched dialog still
 * leaves the instance inheriting this deployment's defaults.
 */
export function BannerSettingsModal({
  open,
  setOpen,
  overrides,
  demoMode,
  baseSettings,
  onSaved,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  overrides: InstanceSettingsOverrides | null;
  demoMode: boolean;
  baseSettings: InstanceSettings;
  onSaved: (overrides: InstanceSettingsOverrides) => void;
}) {
  // No text fields: the link is not an override-style input, so this dialog
  // uses the shared form only for validation, saving, and its toasts.
  const { saving, submit } = useInstanceSettingsForm({
    fields: [],
    overrides,
    demoMode,
    onSaved,
  });
  const settings = resolveInstanceSettings(overrides, baseSettings);
  const [enabled, setEnabled] = useState(settings.betaBannerEnabled);
  const [inWorkspace, setInWorkspace] = useState(settings.feedbackInWorkspace);
  const [url, setUrl] = useState(settings.feedbackUrl ?? "");

  const nextUrl = url.trim() || null;
  const invalidUrl = Boolean(nextUrl && !isFeedbackHref(nextUrl));

  const preview = resolveInstanceSettings(
    {
      betaBannerEnabled: enabled,
      feedbackInWorkspace: inWorkspace,
      feedbackUrl: invalidUrl ? settings.feedbackUrl : nextUrl,
    },
    settings,
  );

  function changes() {
    const body: Record<string, unknown> = {};
    if (enabled !== settings.betaBannerEnabled)
      body.betaBannerEnabled = enabled;
    if (inWorkspace !== settings.feedbackInWorkspace)
      body.feedbackInWorkspace = inWorkspace;
    if (nextUrl !== settings.feedbackUrl) body.feedbackUrl = nextUrl;
    return body;
  }

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      size="lg"
      title="Edit beta banner"
      description="The notice above the workspace, and where it sends someone who has hit a bug or has an idea."
      closable={!saving}
      formId={FORM_ID}
      onSubmit={async (event) => {
        event.preventDefault();
        const saved = await submit({
          extraBody: changes(),
          extraError: invalidUrl
            ? "The feedback link needs a full https:// address or a mailto: email link."
            : undefined,
        });
        if (saved) setOpen(false);
      }}
      hideActions
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={saving}
            loadingText="Saving..."
          >
            Save banner
          </Button>
        </div>
      }
    >
      <div className="settings-form space-y-5">
        <BetaBannerPreview settings={preview} />

        <SwitchField
          label="Show the beta banner"
          description="A dismissible notice above the workspace. Turn it off once this deployment is past its beta."
          checked={enabled}
          disabled={saving}
          onChange={setEnabled}
        />

        <SwitchField
          label="Take feedback as tasks in this workspace"
          description="Only for a workspace whose own team builds this product. Anywhere else a bug report filed here lands in a backlog nobody who can fix it reads."
          checked={inWorkspace}
          disabled={saving}
          onChange={setInWorkspace}
        />

        <div className="space-y-2">
          <Input
            label="Feedback link"
            name="feedbackUrl"
            value={url}
            maxLength={2048}
            placeholder="e.g. https://example.com/feedback or mailto:team@example.com"
            error={invalidUrl}
            disabled={saving}
            onChange={(event) => setUrl(event.target.value)}
          />
          <p
            className="text-xs leading-relaxed text-black/55 dark:text-white/55"
            role={invalidUrl ? "alert" : undefined}
          >
            {invalidUrl
              ? "Enter a full https:// address or a mailto: email link."
              : "An https page or a mailto address. Leave it empty to offer no link at all."}
          </p>
        </div>
      </div>
    </Modal>
  );
}
