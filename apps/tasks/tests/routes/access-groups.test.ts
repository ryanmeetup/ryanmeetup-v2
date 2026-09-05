import { beforeEach, describe, expect, it, vi } from "vitest";

const privilegedContext = vi.fn();
const recordWorkspaceActivity = vi.fn();
vi.mock("@/lib/server/privileged-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/privileged-api")>()),
  privilegedContext,
  recordWorkspaceActivity,
}));

const profileId = "11111111-1111-4111-8111-111111111111";
const tierId = "22222222-2222-4222-8222-222222222222";
const teamId = "33333333-3333-4333-8333-333333333333";

function request(body: unknown) {
  return new Request("http://localhost/api/access-groups", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
}

describe("access administration route", () => {
  beforeEach(() => {
    privilegedContext.mockReset();
    recordWorkspaceActivity.mockReset();
    recordWorkspaceActivity.mockResolvedValue(true);
    process.env.TASKS_APP_URL = "http://localhost";
  });

  it("replaces role, tier, and teams in one database call", async () => {
    const result = {
      profile: { id: profileId, app_role: "owner" },
      members: [
        { group_id: tierId, profile_id: profileId },
        { group_id: teamId, profile_id: profileId },
      ],
    };
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    privilegedContext.mockResolvedValue({
      user: { id: "actor" },
      supabase: { rpc },
      admin: {},
    });
    const { POST } = await import("@/app/api/access-groups/route");

    const response = await POST(
      request({
        action: "profile.access.replace",
        profileId,
        tierId,
        teamIds: [teamId, teamId],
        appRole: "owner",
      }),
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("replace_profile_access", {
      requested_profile_id: profileId,
      requested_tier_id: tierId,
      requested_team_ids: [teamId],
      requested_app_role: "owner",
    });
    expect(await response.json()).toEqual(result);
  });

  it("returns a clear conflict when the last owner would be demoted", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "AO001", message: "last owner" },
    });
    privilegedContext.mockResolvedValue({
      user: { id: profileId },
      supabase: { rpc },
      admin: {},
    });
    const { POST } = await import("@/app/api/access-groups/route");

    const response = await POST(
      request({
        action: "profile.access.replace",
        profileId,
        tierId,
        teamIds: [],
        appRole: "member",
      }),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("another app owner");
  });

  it("changes the new-member default through its canonical RPC", async () => {
    const group = { id: tierId, name: "Members", is_default: true };
    const rpc = vi.fn().mockResolvedValue({ data: group, error: null });
    privilegedContext.mockResolvedValue({
      user: { id: profileId },
      supabase: { rpc },
      admin: {},
    });
    const { POST } = await import("@/app/api/access-groups/route");

    const response = await POST(
      request({ action: "tier.default.set", groupId: tierId }),
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("set_default_access_tier", {
      requested_group_id: tierId,
    });
    expect(await response.json()).toEqual({ group });
  });
});
