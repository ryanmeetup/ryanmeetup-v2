import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizeMcpRead = vi.fn();
const executeMcpRead = vi.fn();
vi.mock("@/lib/server/mcp/read-auth", () => ({ authorizeMcpRead }));
vi.mock("@/lib/server/mcp/read-query", () => ({ executeMcpRead }));

describe("MCP read API routes", () => {
  beforeEach(() => {
    authorizeMcpRead.mockReset();
    executeMcpRead.mockReset();
  });

  it("reports a read-only service only after token authorization", async () => {
    authorizeMcpRead.mockReturnValue({ admin: {} });
    const { GET } = await import("@/app/api/mcp/v1/route");
    const response = GET(new Request("http://localhost/api/mcp/v1"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ readOnly: true, version: 1 });
  });

  it("dispatches only the parsed read action and disables caching", async () => {
    const admin = { from: vi.fn() };
    authorizeMcpRead.mockReturnValue({ admin });
    executeMcpRead.mockResolvedValue({
      action: "get_workspace_overview",
      generatedAt: "2026-08-31T00:00:00.000Z",
      data: {},
    });
    const { POST } = await import("@/app/api/mcp/v1/query/route");
    const response = await POST(
      new Request("http://localhost/api/mcp/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_workspace_overview" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(executeMcpRead).toHaveBeenCalledWith(
      admin,
      "get_workspace_overview",
      {},
    );
  });

  it("returns an authorization failure without reading the request body", async () => {
    authorizeMcpRead.mockReturnValue({
      response: new Response("unauthorized", { status: 401 }),
    });
    const { POST } = await import("@/app/api/mcp/v1/query/route");
    const response = await POST(
      new Request("http://localhost/api/mcp/v1/query", { method: "POST" }),
    );
    expect(response.status).toBe(401);
    expect(executeMcpRead).not.toHaveBeenCalled();
  });
});
