export function formatInstagramHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i,
  );
  return urlMatch ? urlMatch[1] : trimmed.replace(/^@/, "");
}

export function formatPhoneNumber(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";

  const hasCountryCode = digitsOnly.length === 11 && digitsOnly.startsWith("1");
  const local = hasCountryCode ? digitsOnly.slice(1) : digitsOnly;
  if (local.length > 10) return value.trim();

  const prefix = hasCountryCode ? "+1 " : "";
  if (local.length < 4) return `${prefix}(${local}`;
  if (local.length < 7) return `${prefix}(${local.slice(0, 3)}) ${local.slice(3)}`;
  return `${prefix}(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}
