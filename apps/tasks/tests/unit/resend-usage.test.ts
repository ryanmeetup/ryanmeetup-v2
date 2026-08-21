import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelResendEmail,
  delayResendEmail,
  getResendEmail,
  getResendUsage,
  parseResendQuota,
} from "@/lib/server/resend-usage";

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
              {
                id: "email-2",
                subject: "Scheduled email",
                created_at: new Date().toISOString(),
                scheduled_at: new Date(
                  Date.now() + 30 * 60 * 1000,
                ).toISOString(),
                to: ["later@example.com"],
                cc: [],
                bcc: [],
                last_event: "scheduled",
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
        {
          id: "email-2",
          recipientCount: 1,
          recipients: ["later@example.com"],
          lastEvent: "scheduled",
          scheduledAt: expect.any(String),
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
              {
                id: "email-2",
                subject: "Scheduled email",
                created_at: new Date().toISOString(),
                scheduled_at: new Date(
                  Date.now() + 30 * 60 * 1000,
                ).toISOString(),
                to: ["later@example.com"],
                cc: [],
                bcc: [],
                last_event: "scheduled",
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

describe("getResendEmail", () => {
  it("retrieves and normalizes the stored email content", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c",
          subject: "Your Tasks rundown",
          created_at: "2026-08-20T12:00:00.000Z",
          from: "Ryan Meetup <tasks@example.com>",
          to: ["one@example.com"],
          cc: ["two@example.com"],
          bcc: [],
          last_event: "delivered",
          html: "<p>Your rundown</p>",
          text: "Your rundown",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getResendEmail("4ef9a417-02e9-4d39-ad75-9611e0fcc33c"),
    ).resolves.toEqual({
      id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c",
      subject: "Your Tasks rundown",
      createdAt: "2026-08-20T12:00:00.000Z",
      from: "Ryan Meetup <tasks@example.com>",
      recipientCount: 2,
      recipients: ["one@example.com", "two@example.com"],
      lastEvent: "delivered",
      scheduledAt: null,
      html: "<p>Your rundown</p>",
      text: "Your rundown",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails/4ef9a417-02e9-4d39-ad75-9611e0fcc33c",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("returns null when the email is unavailable", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(
      getResendEmail("4ef9a417-02e9-4d39-ad75-9611e0fcc33c"),
    ).resolves.toBeNull();
  });
});

describe("scheduled Resend email actions", () => {
  it("updates and cancels scheduled messages through the expected endpoints", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "email-1" })));
    vi.stubGlobal("fetch", fetchMock);
    const emailId = "4ef9a417-02e9-4d39-ad75-9611e0fcc33c";
    const scheduledAt = "2026-08-21T14:00:00.000Z";

    await expect(delayResendEmail(emailId, scheduledAt)).resolves.toBe(true);
    await expect(cancelResendEmail(emailId)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `https://api.resend.com/emails/${emailId}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ scheduled_at: scheduledAt }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `https://api.resend.com/emails/${emailId}/cancel`,
      expect.objectContaining({ method: "POST" }),
    );
  });
});
