"use client";

import { useState } from "react";
import { Modal, ModalActions, toast } from "@ryanmeetup/ui";
import { errorMessage } from "@/lib/presentation";
import { useInstanceSettingsForm } from "@/hooks/useInstanceSettingsForm";
import {
  identityFields,
  logoKey,
  overridesFromDraft,
  storedText,
} from "@/lib/admin/instance-settings-fields";
import {
  resolveInstanceSettings,
  type InstanceSettings,
  type InstanceSettingsOverrides,
} from "@/lib/instance";
import { InstanceSettingField } from "./InstanceSettingField";
import { InstanceWordmarkField } from "./InstanceWordmarkField";

const FORM_ID = "instance-identity-form";

export function IdentitySettingsModal({
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
  const { draft, setField, errors, saving, submit } = useInstanceSettingsForm({
    fields: identityFields,
    overrides,
    demoMode,
    onSaved,
  });
  const [logo, setLogo] = useState(() => storedText(overrides, logoKey) ?? "");
  const [uploading, setUploading] = useState(false);

  const preview = resolveInstanceSettings(
    {
      ...overridesFromDraft(draft),
      logoPath: logo.trim() || null,
    },
    baseSettings,
  );

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const payload = new FormData();
      payload.append("file", file);
      const response = await fetch("/api/instance-settings/logo", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as {
        logoPath?: string;
        error?: string;
      };
      if (!response.ok || !result.logoPath)
        throw new Error(result.error ?? "The logo could not be uploaded.");
      setLogo(result.logoPath);
      toast.success("Logo uploaded. Save to apply it.");
    } catch (error) {
      toast.error(errorMessage(error, "The logo could not be uploaded."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      size="lg"
      title="Edit identity"
      description="The name and words this workspace goes by, in its own chrome and in the metadata other apps read. Leave a field blank to inherit this deployment's default."
      closable={!saving && !uploading}
      formId={FORM_ID}
      onSubmit={async (event) => {
        event.preventDefault();
        const nextLogo = logo.trim() || null;
        const changed = nextLogo !== storedText(overrides, logoKey);
        if (await submit({ extraBody: changed ? { logoPath: nextLogo } : {} }))
          setOpen(false);
      }}
      actions={
        <ModalActions
          cancelDisabled={saving || uploading}
          confirmDisabled={uploading}
          confirmForm={FORM_ID}
          confirmLabel="Save identity"
          onCancel={() => setOpen(false)}
          pending={saving}
          pendingLabel="Saving..."
        />
      }
    >
      <div className="settings-form space-y-5">
        <InstanceWordmarkField
          logoPath={preview.logoPath}
          name={preview.name}
          uploading={uploading}
          disabled={saving}
          onUpload={(file) => void uploadLogo(file)}
          onClear={() => setLogo("")}
        />
        <p className="text-xs leading-relaxed text-black/55 dark:text-white/55">
          Without an image the instance name is drawn in the display face, which
          scales from the sidebar label to the footer and follows the light and
          dark themes — an uploaded image does neither. An image appears in the
          sidebar, header, and sign-in card; the footer and link-preview card
          always use the name as text.
        </p>

        {identityFields.map((spec) => (
          <InstanceSettingField
            key={spec.key}
            spec={spec}
            defaults={baseSettings}
            value={draft[spec.key]}
            error={errors[spec.key]}
            overridden={Boolean(draft[spec.key].trim())}
            disabled={saving}
            onChange={(value) => setField(spec.key, value)}
            onReset={() => setField(spec.key, "")}
          />
        ))}
      </div>
    </Modal>
  );
}
