import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  decryptGoogleRefreshToken,
  encryptGoogleRefreshToken,
  googleCalendarConnection,
  googleCalendarIntegrationValues,
  googleCalendarMonthRange,
  googleCalendarRedirectUri,
  isGoogleCalendarConfigured,
} from "@/lib/server/google-calendar";

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

    const connection = googleCalendarIntegrationValues(
      "refresh-token",
      "ryan@example.com",
      "user-1",
    );
    expect(googleCalendarConnection(connection)).toMatchObject({
      connected: true,
      email: "ryan@example.com",
      calendarId: "primary",
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

  it("keeps OAuth callbacks on the allowed origin where the connection started", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TASKS_APP_URL", "https://tasks.ryanmeetup.com");

    expect(
      googleCalendarRedirectUri(
        "http://localhost:3000/api/integrations/google-calendar/connect",
      ),
    ).toBe(
      "http://localhost:3000/api/integrations/google-calendar/callback",
    );
    expect(
      googleCalendarRedirectUri(
        "https://tasks.ryanmeetup.com/api/integrations/google-calendar/connect",
      ),
    ).toBe(
      "https://tasks.ryanmeetup.com/api/integrations/google-calendar/callback",
    );
  });
});
