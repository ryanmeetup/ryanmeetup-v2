import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  standardSecurityHeaders,
} from "@/lib/security-headers";

describe("security headers", () => {
  it("builds a restrictive CSP with the Supabase HTTP and WebSocket origins", () => {
    const policy = contentSecurityPolicy(
      "test-nonce",
      "https://example.supabase.co/project",
    );

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self' 'nonce-test-nonce'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain(
      "connect-src 'self' https://example.supabase.co wss://example.supabase.co",
    );
    expect(policy).toContain(
      "img-src 'self' data: blob: https: https://example.supabase.co",
    );
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("defines the standard browser defense-in-depth headers", () => {
    expect(
      Object.fromEntries(
        standardSecurityHeaders.map(({ key, value }) => [key, value]),
      ),
    ).toMatchObject({
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    expect(
      standardSecurityHeaders.find(({ key }) => key === "Permissions-Policy")
        ?.value,
    ).toContain("camera=()");
  });
});
