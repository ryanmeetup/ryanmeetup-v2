import { beforeEach, describe, expect, it, vi } from "vitest";
import { withClockSkewRetry } from "@/lib/supabase/clock-skew";

const refused = () =>
  new Response(
    JSON.stringify({ code: "PGRST301", message: "JWT issued at future" }),
    {
      status: 401,
    },
  );
const expired = () =>
  new Response(JSON.stringify({ code: "PGRST301", message: "JWT expired" }), {
    status: 401,
  });
const ok = () =>
  new Response(JSON.stringify([{ name: "Ryan" }]), { status: 200 });

/** No waiting in tests: one zero-delay entry per replay the case expects. */
const noDelays = [0, 0];

describe("clock-skew retry", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("replays a token refused as issued in the future", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(refused())
      .mockResolvedValueOnce(ok());
    const response = await withClockSkewRetry(
      send,
      noDelays,
    )("/rest/v1/projects");
    expect(send).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ name: "Ryan" }]);
  });

  it("hands back the refusal once the attempts run out", async () => {
    const send = vi.fn().mockResolvedValue(refused());
    const response = await withClockSkewRetry(
      send,
      noDelays,
    )("/rest/v1/projects");
    expect(send).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      message: "JWT issued at future",
    });
  });

  it("leaves every other failure to the caller", async () => {
    const send = vi.fn().mockResolvedValue(expired());
    const response = await withClockSkewRetry(
      send,
      noDelays,
    )("/rest/v1/projects");
    expect(send).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });

  it("sends a successful request once", async () => {
    const send = vi.fn().mockResolvedValue(ok());
    await withClockSkewRetry(send, noDelays)("/rest/v1/projects");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not replay a one-shot Request body", async () => {
    const send = vi.fn().mockResolvedValue(refused());
    const response = await withClockSkewRetry(
      send,
      noDelays,
    )(
      new Request("https://example.test/rest/v1/projects", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });
});
