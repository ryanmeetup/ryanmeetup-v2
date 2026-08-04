const supabaseDirectives = (supabaseUrl?: string) => {
  if (!supabaseUrl) return [];

  try {
    const url = new URL(supabaseUrl);
    const websocketProtocol = url.protocol === "http:" ? "ws:" : "wss:";
    const websocketOrigin = `${websocketProtocol}//${url.host}`;

    return [url.origin, websocketOrigin];
  } catch {
    return [];
  }
};

export function contentSecurityPolicy(nonce: string, supabaseUrl?: string) {
  const externalOrigins = supabaseDirectives(supabaseUrl);
  const isDevelopment = process.env.NODE_ENV === "development";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: blob:${externalOrigins.length ? ` ${externalOrigins[0]}` : ""}`,
    `connect-src 'self'${externalOrigins.length ? ` ${externalOrigins.join(" ")}` : ""}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export const standardSecurityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), geolocation=(), microphone=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
] as const;
