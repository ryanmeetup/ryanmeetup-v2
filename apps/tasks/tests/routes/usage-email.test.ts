import { beforeEach, describe, expect, it, vi } from "vitest";

const authorize = vi.fn();
const getResendEmail = vi.fn();
const cancelResendEmail = vi.fn();
const delayResendEmail = vi.fn();
const privilegedContext = vi.fn();
const auditPrivilegedAction = vi.fn();
const readJson = vi.fn();

vi.mock("@/lib/server/auth", () => ({ authorize }));
vi.mock("@/lib/server/resend-usage", () => ({
  cancelResendEmail,
  delayResendEmail,
  getResendEmail,
}));
vi.mock("@/lib/server/privileged-api", () => ({
  auditPrivilegedAction,
  privilegedContext,
  readJson,
}));

const emailId = "4ef9a417-02e9-4d39-ad75-9611e0fcc33c";
const context = { params: Promise.resolve({ id: emailId }) };

describe("GET /api/usage/emails/[id]", () => {
  beforeEach(() => {
    authorize.mockReset();
    getResendEmail.mockReset();
    cancelResendEmail.mockReset();
    delayResendEmail.mockReset();
    privilegedContext.mockReset();
    auditPrivilegedAction.mockReset();
    readJson.mockReset();
  });

  it("requires an onboarded workspace owner", async () => {
    authorize.mockResolvedValue({
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    const { GET } = await import("@/app/api/usage/emails/[id]/route");

    const response = await GET(
      new Request(`http://localhost/api/usage/emails/${emailId}`),
      context,
    );

    expect(response.status).toBe(403);
    expect(authorize).toHaveBeenCalledWith({ owner: true, onboarded: true });
    expect(getResendEmail).not.toHaveBeenCalled();
  });

  it("returns the stored email content", async () => {
    authorize.mockResolvedValue({ user: { id: "owner-1" }, supabase: {} });
    getResendEmail.mockResolvedValue({
      id: emailId,
      subject: "Your Tasks rundown",
      createdAt: "2026-08-20T12:00:00.000Z",
      from: "Ryan Meetup <tasks@example.com>",
      recipientCount: 1,
      recipients: ["one@example.com"],
      lastEvent: "delivered",
      scheduledAt: null,
      html: "<p>Your rundown</p>",
      text: "Your rundown",
    });
    const { GET } = await import("@/app/api/usage/emails/[id]/route");

    const response = await GET(
      new Request(`http://localhost/api/usage/emails/${emailId}`),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      email: { id: emailId, html: "<p>Your rundown</p>" },
    });
    expect(getResendEmail).toHaveBeenCalledWith(emailId);
  });

  it("rejects malformed email IDs before contacting Resend", async () => {
    authorize.mockResolvedValue({ user: { id: "owner-1" }, supabase: {} });
    const { GET } = await import("@/app/api/usage/emails/[id]/route");

    const response = await GET(
      new Request("http://localhost/api/usage/emails/not-an-id"),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );

    expect(response.status).toBe(400);
    expect(getResendEmail).not.toHaveBeenCalled();
  });

  it("delays a scheduled email by 30 minutes and audits the action", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T13:00:00.000Z"));
    readJson.mockResolvedValue({ data: { action: "delay" } });
    privilegedContext.mockResolvedValue({
      user: { id: "owner-1" },
      admin: {},
      supabase: {},
    });
    getResendEmail.mockResolvedValue({
      id: emailId,
      subject: "Your Tasks rundown",
      createdAt: "2026-08-21T13:00:00.000Z",
      from: "Ryan Meetup <tasks@example.com>",
      recipientCount: 1,
      recipients: ["one@example.com"],
      lastEvent: "scheduled",
      scheduledAt: "2026-08-21T13:30:00.000Z",
      html: "<p>Your rundown</p>",
      text: "Your rundown",
    });
    delayResendEmail.mockResolvedValue(true);
    auditPrivilegedAction.mockResolvedValue(true);
    const { POST } = await import("@/app/api/usage/emails/[id]/route");

    const response = await POST(
      new Request(`http://localhost/api/usage/emails/${emailId}`, {
        method: "POST",
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(delayResendEmail).toHaveBeenCalledWith(
      emailId,
      "2026-08-21T14:00:00.000Z",
    );
    expect(auditPrivilegedAction).toHaveBeenCalledWith(
      {},
      { id: "owner-1" },
      expect.objectContaining({ action: "email.delay", targetId: emailId }),
    );
    vi.useRealTimers();
  });

  it("cancels a scheduled email", async () => {
    readJson.mockResolvedValue({ data: { action: "cancel" } });
    privilegedContext.mockResolvedValue({
      user: { id: "owner-1" },
      admin: {},
      supabase: {},
    });
    getResendEmail.mockResolvedValue({
      id: emailId,
      subject: "Your Tasks rundown",
      createdAt: "2026-08-21T13:00:00.000Z",
      from: "Ryan Meetup <tasks@example.com>",
      recipientCount: 1,
      recipients: ["one@example.com"],
      lastEvent: "scheduled",
      scheduledAt: "2026-08-21T13:30:00.000Z",
      html: "<p>Your rundown</p>",
      text: "Your rundown",
    });
    cancelResendEmail.mockResolvedValue(true);
    auditPrivilegedAction.mockResolvedValue(true);
    const { POST } = await import("@/app/api/usage/emails/[id]/route");

    const response = await POST(
      new Request(`http://localhost/api/usage/emails/${emailId}`, {
        method: "POST",
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(cancelResendEmail).toHaveBeenCalledWith(emailId);
    expect((await response.json()).email.lastEvent).toBe("canceled");
  });
});
