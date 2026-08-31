import {
  DIGEST_LIMITS,
  isDigestSectionKey,
  isSupportedTimeZone,
} from "@/lib/digest/digest-settings";
import { objectWithKeys } from "./shared";

const integerIn =
  ({ min, max }: { min: number; max: number }) =>
  (raw: unknown) =>
    Number.isInteger(raw) && (raw as number) >= min && (raw as number) <= max
      ? (raw as number)
      : null;

const boolean = (raw: unknown) => (typeof raw === "boolean" ? raw : null);

/** 1–7 unique day indexes, `Date.getDay()` style. Order is not significant. */
const weekdays = (raw: unknown) => {
  if (!Array.isArray(raw) || !raw.length || raw.length > 7) return null;
  const days = [...new Set(raw)];
  if (days.length !== raw.length) return null;
  if (!days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))
    return null;
  return (days as number[]).sort((left, right) => left - right);
};

/** 1–5 unique section keys. Order *is* significant: it is the render order. */
const sections = (raw: unknown) => {
  if (!Array.isArray(raw) || !raw.length || raw.length > 5) return null;
  if (new Set(raw).size !== raw.length) return null;
  return raw.every(isDigestSectionKey) ? (raw as string[]) : null;
};

const timeZone = (raw: unknown) =>
  typeof raw === "string" && raw.length <= 64 && isSupportedTimeZone(raw)
    ? raw
    : null;

/**
 * A partial cadence update. Unlike branding, digest settings have no "inherit
 * from the build" tier — the row is always fully populated by its column
 * defaults — so `null` is rejected rather than treated as a reset.
 */
export function digestSettingsSchema(value: unknown) {
  const fields = {
    enabled: boolean,
    weekdays,
    sendHour: integerIn(DIGEST_LIMITS.sendHour),
    timeZone,
    reviewMinutes: integerIn(DIGEST_LIMITS.reviewMinutes),
    upcomingDays: integerIn(DIGEST_LIMITS.upcomingDays),
    recentDays: integerIn(DIGEST_LIMITS.recentDays),
    sections,
    maxRecipients: integerIn(DIGEST_LIMITS.maxRecipients),
  } as const;

  const body = objectWithKeys(value, Object.keys(fields));
  if (!body) return null;

  const parsed: Record<string, unknown> = {};
  for (const [key, validate] of Object.entries(fields)) {
    const raw = body[key];
    if (raw === undefined) continue;
    const result = (validate as (input: unknown) => unknown)(raw);
    if (result === null) return null;
    parsed[key] = result;
  }
  return Object.keys(parsed).length ? parsed : null;
}
