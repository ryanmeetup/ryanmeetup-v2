import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const validBody = {
  task: { title: "  Ship it  ", status_id: "status-1", priority: "high" },
  categoryIds: ["category-1", "category-1"],
};

describe("POST /api/tasks", () => {
  beforeEach(() => createClient.mockReset());

  it("rejects an anonymous request before attempting a mutation", async () => {
    const rpc = vi.fn();
    createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, rpc });
    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(new Request("http://test/api/tasks", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the transactional RPC and normalizes user input", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { task: { id: "task-1" } }, error: null });
    createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) }, rpc });
    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(new Request("http://test/api/tasks", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("save_task", expect.objectContaining({
      task_values: expect.objectContaining({ title: "Ship it" }),
      category_ids: ["category-1"],
    }));
  });

  it("surfaces a failed atomic mutation without reporting success", async () => {
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "permission denied" } }),
    });
    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(new Request("http://test/api/tasks", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "permission denied" });
  });
});
