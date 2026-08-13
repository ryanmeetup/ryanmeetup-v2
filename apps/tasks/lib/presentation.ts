export function profileDisplayName(
  profile?: { full_name: string | null },
  fallback = "Teammate",
) {
  return profile?.full_name || fallback;
}

export function errorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

export function formatFileSize(
  value: number | null,
  nullValue: string | null = null,
) {
  if (value === null) return nullValue;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMimeSubtype(mimeType: string | null) {
  return mimeType?.split("/").at(-1)?.toUpperCase() ?? null;
}

export function splitCommaSeparated(value: string) {
  return value.split(",").filter(Boolean);
}
