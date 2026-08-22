"use client";

import { useCallback, useState } from "react";
import { toast } from "@ryanmeetup/ui";
import { errorMessage } from "@/lib/presentation";
import { mutate } from "@/lib/mutation-client";
import {
  diffTextKeys,
  draftForKeys,
  validateTextFields,
  type InstanceDraft,
  type InstanceFieldSpec,
  type InstanceTextKey,
} from "@/lib/admin/instance-settings-fields";
import type {
  InstanceSettings,
  InstanceSettingsOverrides,
} from "@/lib/instance";

type SaveResult = {
  settings: InstanceSettings;
  overrides: InstanceSettingsOverrides;
};

/**
 * Draft state for one settings dialog.
 *
 * Each dialog owns the keys it edits and PATCHes only those, so saving the
 * footer cannot touch the link-preview copy and a validation failure in one
 * concern never blocks another. The API merges by column, which is what makes
 * these independent writes safe.
 */
export function useInstanceSettingsForm({
  fields,
  overrides,
  demoMode,
  onSaved,
}: {
  fields: InstanceFieldSpec[];
  overrides: InstanceSettingsOverrides | null;
  demoMode: boolean;
  onSaved: (overrides: InstanceSettingsOverrides) => void;
}) {
  const keys = fields.map((field) => field.key);
  const [draft, setDraft] = useState(() => draftForKeys(keys, overrides));
  const [errors, setErrors] = useState<Partial<Record<InstanceTextKey, string>>>(
    {},
  );
  const [saving, setSaving] = useState(false);

  const setField = useCallback((key: InstanceTextKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      key in current ? { ...current, [key]: undefined } : current,
    );
  }, []);

  /** Discard edits and return to whatever the server last confirmed. */
  const reset = useCallback(
    (next: InstanceSettingsOverrides | null = overrides) => {
      setDraft(draftForKeys(keys, next));
      setErrors({});
    },
    // `keys` is derived from a module-level constant array per dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overrides],
  );

  /**
   * Validate, then PATCH this dialog's keys plus any structured values the
   * caller contributes. Resolves true when the dialog may close.
   */
  async function submit({
    extraBody = {},
    extraError,
  }: {
    extraBody?: Record<string, unknown>;
    extraError?: string;
  } = {}) {
    const found = validateTextFields(fields, draft);
    if (Object.keys(found).length || extraError) {
      setErrors(found);
      toast.error(
        extraError ?? "Some fields need attention before this can be saved.",
      );
      return false;
    }

    const body = { ...diffTextKeys(keys, draft, overrides), ...extraBody };
    if (!Object.keys(body).length) {
      toast.success("No changes to save.");
      return true;
    }
    if (demoMode) {
      toast.error("Settings cannot be saved in demo mode.");
      return false;
    }

    setSaving(true);
    try {
      const result = await mutate<SaveResult>("/api/instance-settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved(result.overrides);
      setErrors({});
      toast.success("Settings saved.");
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "The settings could not be saved."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { draft, setField, errors, saving, submit, reset } as {
    draft: InstanceDraft;
    setField: (key: InstanceTextKey, value: string) => void;
    errors: Partial<Record<InstanceTextKey, string>>;
    saving: boolean;
    submit: (options?: {
      extraBody?: Record<string, unknown>;
      extraError?: string;
    }) => Promise<boolean>;
    reset: (next?: InstanceSettingsOverrides | null) => void;
  };
}
