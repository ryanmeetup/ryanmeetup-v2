import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  decryptGoogleRefreshToken,
  encryptGoogleRefreshToken,
  googleCalendarAppMetadata,
  googleCalendarConnection,
  googleCalendarMonthRange,
  isGoogleCalendarConfigured,
  withoutGoogleCalendarAppMetadata,
} from "@/lib/server/google-calendar";

const user = (appMetadata: Record<string, unknown> = {}) =>
  ({ id: "user-1", app_metadata: appMetadata }) as User;

function configure() {
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "client-id");
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "client-secret");
  vi.stubEnv("GOOGLE_CALENDAR_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
}

afterEach(() => vi.unstubAllEnvs());

describe("Google Calendar connection storage", () => {
  it("requires all OAuth settings and a 32-byte encryption key", () => {
    expect(isGoogleCalendarConfigured()).toBe(false);
    configure();
    expect(isGoogleCalendarConfigured()).toBe(true);
    vi.stubEnv("GOOGLE_CALENDAR_TOKEN_KEY", Buffer.alloc(16).toString("base64"));
    expect(isGoogleCalendarConfigured()).toBe(false);
  });

  it("encrypts refresh tokens before storing connection metadata", () => {
    configure();
    const encrypted = encryptGoogleRefreshToken("refresh-token");
    expect(encrypted).not.toContain("refresh-token");
    expect(decryptGoogleRefreshToken(encrypted)).toBe("refresh-token");

    const metadata = googleCalendarAppMetadata(
      user({ role: "member" }),
      "refresh-token",
      "ryan@example.com",
    );
    const connectedUser = user(metadata);
    expect(googleCalendarConnection(connectedUser)).toMatchObject({
      connected: true,
      email: "ryan@example.com",
    });
    expect(withoutGoogleCalendarAppMetadata(connectedUser)).toEqual({
      role: "member",
    });
  });

  it("accepts only canonical year-month values", () => {
    expect(googleCalendarMonthRange("2026-08")).toEqual({
      start: "2026-07-25T00:00:00.000Z",
      end: "2026-09-08T00:00:00.000Z",
    });
    expect(googleCalendarMonthRange("2026-8")).toBeNull();
    expect(googleCalendarMonthRange("2026-13")).toBeNull();
  });
});
