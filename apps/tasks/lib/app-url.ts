export const productionTasksAppOrigin = "https://tasks.ryanmeetup.com";

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (
      url.username ||
      url.password ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback))
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function configuredOrigin() {
  const configured =
    process.env.TASKS_APP_URL ?? process.env.NEXT_PUBLIC_TASKS_APP_URL;
  const origin = normalizeOrigin(configured);
  if (configured && !origin) {
    throw new Error("TASKS_APP_URL must be a valid HTTPS origin (or loopback HTTP URL).");
  }
  return origin;
}

function allowedRequestOrigins() {
  return new Set(
    (process.env.TASKS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => normalizeOrigin(value.trim()))
      .filter((value): value is string => Boolean(value)),
  );
}

function requestOrigin(request?: Request | string) {
  if (!request) return null;
  const candidate = normalizeOrigin(
    typeof request === "string" ? request : request.url,
  );
  if (!candidate) return null;

  const hostname = new URL(candidate).hostname;
  const isDevelopmentLoopback =
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1");

  return isDevelopmentLoopback || allowedRequestOrigins().has(candidate)
    ? candidate
    : null;
}

export function isAllowedTasksRequestOrigin(value: string | null) {
  const origin = normalizeOrigin(value ?? undefined);
  if (!origin) return false;

  const hostname = new URL(origin).hostname;
  const isDevelopmentLoopback =
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1");

  return (
    isDevelopmentLoopback ||
    origin === configuredOrigin() ||
    allowedRequestOrigins().has(origin)
  );
}

/**
 * Origin for statically evaluated metadata, where no request is available and a
 * missing configuration must not break the render. Falls back to the original
 * Ryan Meetup deployment, matching how the rest of the instance defaults work.
 */
export function metadataOrigin() {
  return configuredOrigin() ?? productionTasksAppOrigin;
}

export function tasksAppOrigin(request?: Request | string) {
  const origin = configuredOrigin() ?? requestOrigin(request);
  if (origin) return origin;

  throw new Error(
    "Set TASKS_APP_URL to this deployment's canonical origin or allowlist the request origin with TASKS_ALLOWED_ORIGINS.",
  );
}

export function tasksAppUrl(path: string, request?: Request | string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Tasks app paths must be root-relative.");
  }
  return new URL(path, tasksAppOrigin(request)).toString();
}
