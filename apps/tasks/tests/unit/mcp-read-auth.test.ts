import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAdminClient = vi.fn();
vi.mock("@/lib/server/admin-client", () => ({ getAdminClient }));

const originalEnabled = process.env.TASKS_MCP_READ_ENABLED;
const originalHash = process.env.TASKS_MCP_READ_TOKEN_SHA256;
const token = "a-read-token-that-is-long-enough-for-the-test";

describe("MCP read authorization", () => {
  beforeEach(() => {
    vi.resetModules();
    getAdminClient.mockReset();
    process.env.TASKS_MCP_READ_ENABLED = "true";
    process.env.TASKS_MCP_READ_TOKEN_SHA256 = createHash("sha256")
      .update(token)
      .digest("hex");
  });

  afterEach(() => {
    if (originalEnabled === undefined)
      delete process.env.TASKS_MCP_READ_ENABLED;
    else process.env.TASKS_MCP_READ_ENABLED = originalEnabled;
    if (originalHash === undefined)
      delete process.env.TASKS_MCP_READ_TOKEN_SHA256;
    else process.env.TASKS_MCP_READ_TOKEN_SHA256 = originalHash;
  });

  it("stays disabled unless the deployment explicitly opts in", async () => {
    process.env.TASKS_MCP_READ_ENABLED = "false";
    const { authorizeMcpRead } = await import(
      "@/lib/server/mcp/read-auth"
    );
    const result = authorizeMcpRead(new Request("http://localhost/api/mcp/v1"));
    expect("response" in result && result.response.status).toBe(503);
    expect(getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects missing and incorrect bearer tokens before creating an admin client", async () => {
    const { authorizeMcpRead } = await import(
      "@/lib/server/mcp/read-auth"
    );
    for (const authorization of [undefined, "Basic nope", "Bearer wrong"]) {
      const headers: HeadersInit = authorization
        ? { Authorization: authorization }
        : {};
      const result = authorizeMcpRead(
        new Request("http://localhost/api/mcp/v1", { headers }),
      );
      expect("response" in result && result.response.status).toBe(401);
    }
    expect(getAdminClient).not.toHaveBeenCalled();
  });

  it("returns the server-only client for the dedicated token", async () => {
    const admin = { from: vi.fn() };
    getAdminClient.mockReturnValue(admin);
    const { authorizeMcpRead } = await import(
      "@/lib/server/mcp/read-auth"
    );
    const result = authorizeMcpRead(
      new Request("http://localhost/api/mcp/v1", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(result).toEqual({ admin });
  });
});
