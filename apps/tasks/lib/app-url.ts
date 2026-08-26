/**
 * Last resort for metadata when no origin can be discovered. Deliberately not a
 * real domain: a build that cannot name itself must not advertise somebody
 * else's host in its link previews, and this is also what Next.js resolves
 * relative metadata against when `metadataBase` is unset.
 */
export const developmentFallbackOrigin = "http://localhost:3000";

/** First entry of a header or variable that may carry a proxy chain. */
function firstEntry(value: string | null | undefined) {
  const head = value?.split(",")[0]?.trim();
  return head ? head : null;
}

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
 * The origin this deployment is being served from, taken from the proxy headers
 * of the request in hand.
 *
 * Only `metadataBase` uses this, and its value is reflected back to the same
 * request that supplied it, so a forged `Host` poisons nothing but the forger's
 * own link previews. State-changing requests are a different matter and keep
 * going through `isAllowedTasksRequestOrigin`'s allowlist, which this must not
 * be folded into: an instance that has configured nothing has an empty
 * allowlist, and that is exactly the case this resolves.
 */
function forwardedOrigin(requestHeaders?: Headers | null) {
  if (!requestHeaders) return null;
  const host =
    firstEntry(requestHeaders.get("x-forwarded-host")) ??
    firstEntry(requestHeaders.get("host"));
  if (!host) return null;
  const isLoopback = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol =
    firstEntry(requestHeaders.get("x-forwarded-proto")) ??
    (isLoopback ? "http" : "https");
  return normalizeOrigin(`${protocol}://${host}`);
}

/**
 * The project's stable production domain, which Vercel injects with no
 * configuration. `VERCEL_URL` is deliberately not consulted: it is the
 * per-deployment hostname and would put preview URLs in canonical metadata.
 */
function vercelProductionOrigin() {
  const domain = firstEntry(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  return domain ? normalizeOrigin(`https://${domain}`) : null;
}

/**
 * Origin for metadata, where a missing configuration must not break the render.
 * Unlike `tasksAppOrigin` this never throws, so it degrades through everything
 * it can infer before giving up: explicit configuration, then the request being
 * served, then the deployment's production domain, then localhost.
 */
export function metadataOrigin(requestHeaders?: Headers | null) {
  return (
    configuredOrigin() ??
    forwardedOrigin(requestHeaders) ??
    vercelProductionOrigin() ??
    developmentFallbackOrigin
  );
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
