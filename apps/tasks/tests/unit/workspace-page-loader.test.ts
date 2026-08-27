import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectError extends Error {
  constructor(readonly location: string) {
    super(`NEXT_REDIRECT ${location}`);
  }
}

const getUser = vi.fn();
const seedDefaultStatusesIfEmpty = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (location: string) => {
    throw new RedirectError(location);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, rpc: vi.fn() }),
}));

vi.mock("@/lib/server/workspace-loader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/workspace-loader")>()),
  loadWorkspace: vi.fn(),
}));

vi.mock("@/lib/server/default-statuses", () => ({
  seedDefaultStatusesIfEmpty,
}));

const { loadWorkspacePage } = await import("@/lib/server/workspace-page-loader");
const { loadWorkspace, WorkspaceLoadError } = await import(
  "@/lib/server/workspace-loader"
);
const loadWorkspaceMock = vi.mocked(loadWorkspace);

describe("loadWorkspacePage error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "ryan" } }, error: null });
  });

  it("sends a failed page to the profile fallback by default", async () => {
    loadWorkspaceMock.mockRejectedValue(new WorkspaceLoadError("statuses"));

    await expect(loadWorkspacePage(["statuses"])).rejects.toMatchObject({
      location: "/profile",
    });
  });

  it("rethrows for the profile route so it never redirects to itself", async () => {
    const failure = new WorkspaceLoadError("statuses");
    loadWorkspaceMock.mockRejectedValue(failure);

    await expect(
      loadWorkspacePage(["statuses"], { onLoadError: "throw" }),
    ).rejects.toBe(failure);
  });

  it("still redirects an unauthenticated visitor to the login page", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(
      loadWorkspacePage(["statuses"], { onLoadError: "throw" }),
    ).rejects.toMatchObject({ location: "/login" });
  });

  it("repairs and reloads an empty status collection", async () => {
    const workspace = {
      currentProfile: { id: "ryan", onboarding_completed: true },
      statuses: [],
    };
    const repaired = {
      ...workspace,
      statuses: [{ id: "backlog", name: "Backlog" }],
    };
    loadWorkspaceMock
      .mockResolvedValueOnce(workspace as never)
      .mockResolvedValueOnce(repaired as never);

    await expect(loadWorkspacePage(["statuses"])).resolves.toMatchObject({
      data: repaired,
    });
    expect(seedDefaultStatusesIfEmpty).toHaveBeenCalledOnce();
    expect(loadWorkspaceMock).toHaveBeenCalledTimes(2);
  });
});
