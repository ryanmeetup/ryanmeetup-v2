const unsafeEntryPrefixes = [
  "/account-error",
  "/auth/",
  "/forgot-password",
  "/login",
  "/profile",
  "/reset-password",
] as const;

/** Only workspace-local destinations may survive an auth/onboarding redirect. */
export function safeWorkspaceReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/";
  if (unsafeEntryPrefixes.some((prefix) => value.startsWith(prefix)))
    return "/";
  return value;
}

export function onboardingHref(returnTo: unknown): string {
  const destination = safeWorkspaceReturnPath(returnTo);
  return `/profile?reason=onboarding&next=${encodeURIComponent(destination)}`;
}

export function authCallbackDestination(next: unknown): string {
  if (next === "/reset-password") return next;
  return next ? safeWorkspaceReturnPath(next) : onboardingHref("/");
}

export function workspaceEntryRedirect({
  allowIncomplete,
  hasProfile,
  onboardingCompleted,
  returnTo,
}: {
  allowIncomplete: boolean;
  hasProfile: boolean;
  onboardingCompleted: boolean;
  returnTo: unknown;
}): string | null {
  if (!hasProfile) return "/account-error?reason=profile";
  if (!allowIncomplete && !onboardingCompleted) return onboardingHref(returnTo);
  return null;
}
