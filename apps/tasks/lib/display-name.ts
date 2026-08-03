const MAX_DISPLAY_NAME_LENGTH = 80;

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function displayNameError(value: string) {
  const name = normalizeDisplayName(value);
  if (!name || name.length > MAX_DISPLAY_NAME_LENGTH)
    return `Display name must be between 1 and ${MAX_DISPLAY_NAME_LENGTH} characters.`;

  const parts = name.split(" ");
  if (parts.length < 2 || !parts.every((part) => /\p{L}/u.test(part)))
    return "Enter your first and last name.";

  return null;
}
