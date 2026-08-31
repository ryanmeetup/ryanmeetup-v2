"use client";

import { Modal, ModalActions } from "@ryanmeetup/ui";
import { useInstanceSettingsForm } from "@/hooks/useInstanceSettingsForm";
import {
  accentField,
  hexPattern,
  overridesFromDraft,
} from "@/lib/admin/instance-settings-fields";
import {
  resolveInstanceSettings,
  type InstanceSettings,
  type InstanceSettingsOverrides,
} from "@/lib/instance";
import { AccentEmailPreview } from "./AccentEmailPreview";
import { InstanceSettingField } from "./InstanceSettingField";

const FORM_ID = "instance-email-form";
const fields = [accentField];

export function EmailSettingsModal({
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
    fields,
    overrides,
    demoMode,
    onSaved,
  });

  const preview = resolveInstanceSettings(
    {
      ...overrides,
      ...overridesFromDraft(draft),
    },
    baseSettings,
  );
  const accent = draft.accentColor;

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      size="md"
      title="Edit email accent"
      description="The app is themed from the shared brand tokens, which email cannot use. This colour exists for that one reason and appears nowhere in the interface."
      closable={!saving}
      formId={FORM_ID}
      onSubmit={async (event) => {
        event.preventDefault();
        if (await submit()) setOpen(false);
      }}
      actions={
        <ModalActions
          confirmForm={FORM_ID}
          confirmLabel="Save accent"
          onCancel={() => setOpen(false)}
          pending={saving}
          pendingLabel="Saving..."
        />
      }
    >
      <div className="settings-form space-y-5">
        <AccentEmailPreview
          accentColor={preview.accentColor}
          wordmark={preview.name.toUpperCase()}
        />
        <InstanceSettingField
          spec={accentField}
          defaults={baseSettings}
          value={accent}
          error={errors.accentColor}
          overridden={Boolean(accent.trim())}
          disabled={saving}
          onChange={(value) => setField("accentColor", value)}
          onReset={() => setField("accentColor", "")}
          trailingAction={
            <input
              type="color"
              aria-label="Pick an accent color"
              disabled={saving}
              className="color-input !h-7 !w-7 rounded-md border border-black/15 dark:border-white/20"
              value={
                hexPattern.test(accent) ? accent : baseSettings.accentColor
              }
              onChange={(event) => setField("accentColor", event.target.value)}
            />
          }
        />
      </div>
    </Modal>
  );
}
