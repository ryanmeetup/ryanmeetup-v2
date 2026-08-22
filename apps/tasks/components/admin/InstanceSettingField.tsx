"use client";

import type { ReactNode } from "react";
import { Input, Textarea } from "@ryanmeetup/ui";
import { instanceDefaults } from "@/lib/instance";
import type {
  InstanceFieldSpec,
  InstanceTextKey,
} from "@/lib/admin/instance-settings-fields";

/** What this build falls back to, trimmed to something that fits one line. */
function inheritedValue(key: InstanceTextKey) {
  const fallback = instanceDefaults[key];
  if (typeof fallback !== "string" || !fallback) return null;
  return fallback.length > 56 ? `${fallback.slice(0, 55)}…` : fallback;
}

/**
 * One settings input, following the profile form's field idiom: the control,
 * then a small note directly beneath it, stacked in a single column.
 *
 * An empty input is not a missing value — it means the instance inherits the
 * build-time default. The placeholder is a generic example rather than that
 * default, because a placeholder showing the real value is indistinguishable
 * from a filled-in field; the inherited value is named in the note instead.
 */
export function InstanceSettingField({
  spec,
  value,
  error,
  overridden,
  disabled,
  onChange,
  onReset,
  trailingAction,
}: {
  spec: InstanceFieldSpec;
  value: string;
  error?: string;
  overridden: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
  trailingAction?: ReactNode;
}) {
  const inherited = inheritedValue(spec.key);

  return (
    <div className="space-y-2">
      {spec.multiline ? (
        <Textarea
          id={spec.key}
          label={spec.label}
          name={spec.key}
          rows={3}
          value={value}
          maxLength={spec.maxLength}
          placeholder={spec.placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          label={spec.label}
          name={spec.key}
          value={value}
          maxLength={spec.maxLength}
          placeholder={spec.placeholder}
          error={Boolean(error)}
          disabled={disabled}
          trailingAction={trailingAction}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {error ? (
        <p
          className="text-xs leading-relaxed text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-black/55 dark:text-white/55">
          {spec.hint && <span>{spec.hint} </span>}
          {overridden ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onReset}
              className="rounded-sm font-semibold text-black/70 underline underline-offset-2 transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-50 dark:text-white/70 dark:hover:text-white dark:focus-visible:ring-white/40"
            >
              Reset to default
            </button>
          ) : (
            <span className="italic opacity-80">
              {inherited ? `Using “${inherited}”` : "Not set"}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
