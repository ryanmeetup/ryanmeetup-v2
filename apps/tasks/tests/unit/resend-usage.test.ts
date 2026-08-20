import { afterEach, describe, expect, it, vi } from "vitest";
import { getResendUsage, parseResendQuota } from "@/lib/server/resend-usage";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("parseResendQuota", () => {
  it("uses the configured plan limit for numeric usage headers", () => {
    expect(parseResendQuota("42", 100)).toEqual({
      used: 42,
      limit: 100,
      estimated: false,
    });
  });

  it("accepts a limit included in a compound quota header", () => {
    expect(parseResendQuota("420 / 3000", 1000)).toEqual({
      used: 420,
      limit: 3000,
      estimated: false,
    });
  });

  it("rejects absent or invalid usage", () => {
    expect(parseResendQuota(null, 100)).toBeNull();
    expect(parseResendQuota("nope", 100)).toBeNull();
    expect(parseResendQuota("-1", 100)).toBeNull();
  });
});

describe("getResendUsage", () => {
  it("returns setup guidance when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await expect(getResendUsage()).resolves.toMatchObject({
      status: "unconfigured",
      daily: null,
      monthly: null,
    });
  });

  it("reads quota headers and summarizes recent email activity", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "email-1",
                subject: "Your Tasks rundown",
                created_at: "2026-08-20T12:00:00.000Z",
                to: ["one@example.com"],
                cc: ["two@example.com"],
                bcc: null,
                last_event: "delivered",
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-resend-daily-quota": "34",
              "x-resend-monthly-quota": "1248",
            },
          },
        ),
      ),
    );

    await expect(getResendUsage()).resolves.toMatchObject({
      status: "available",
      daily: { used: 34, limit: 100, estimated: false },
      monthly: { used: 1248, limit: 3000, estimated: false },
      recentEmails: [
        {
          id: "email-1",
          recipientCount: 2,
          recipients: ["one@example.com", "two@example.com"],
          lastEvent: "delivered",
        },
      ],
    });
  });

  it("estimates usage from recipient history when headers are absent", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            has_more: false,
            data: [
              {
                id: "email-1",
                subject: "Fresh email",
                created_at: new Date().toISOString(),
                to: ["one@example.com", "two@example.com"],
                cc: [],
                bcc: [],
                last_event: "delivered",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(getResendUsage()).resolves.toMatchObject({
      status: "available",
      daily: { used: 2, limit: 100, estimated: true },
      monthly: { used: 2, limit: 3000, estimated: true },
      message: expect.stringContaining("estimated"),
    });
  });
});
