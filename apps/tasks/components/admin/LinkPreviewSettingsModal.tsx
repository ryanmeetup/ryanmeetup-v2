"use client";

import { Modal, ModalActions } from "@ryanmeetup/ui";
import { useInstanceSettingsForm } from "@/hooks/useInstanceSettingsForm";
import {
  overridesFromDraft,
  previewFields,
} from "@/lib/admin/instance-settings-fields";
import {
  resolveInstanceSettings,
  type InstanceSettings,
  type InstanceSettingsOverrides,
} from "@/lib/instance";
import { InstanceLinkPreview } from "./InstanceLinkPreview";
import { InstanceSettingField } from "./InstanceSettingField";

const FORM_ID = "instance-link-preview-form";

export function LinkPreviewSettingsModal({
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
    fields: previewFields,
    overrides,
    demoMode,
    onSaved,
  });

  // The identity values are not editable here, so they come from the stored
  // row rather than this dialog's draft.
  const preview = resolveInstanceSettings(
    {
      ...overrides,
      ...overridesFromDraft(draft),
    },
    baseSettings,
  );

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      size="lg"
      title="Edit link preview"
      description="The card other apps show when someone pastes a link to this workspace into Slack, Messages, or Discord. Each field follows from the identity unless you set it."
      closable={!saving}
      formId={FORM_ID}
      onSubmit={async (event) => {
        event.preventDefault();
        if (await submit()) setOpen(false);
      }}
      actions={
        <ModalActions
          confirmForm={FORM_ID}
          confirmLabel="Save link preview"
          onCancel={() => setOpen(false)}
          pending={saving}
          pendingLabel="Saving..."
        />
      }
    >
      <div className="settings-form space-y-5">
        <InstanceLinkPreview settings={preview} />
        {previewFields.map((spec) => (
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
