import { describe, expect, it, vi } from "vitest";
import { readBeginnerFlowHealth } from "@/lib/server/beginner-flow-health";

describe("beginner-flow health", () => {
  it("accepts the database health contract", async () => {
    const health = {
      healthy: true,
      contractOk: true,
      profileTriggerActive: true,
      defaultTierCount: 1,
      profileCount: 13,
      profilesWithoutTier: 0,
      authUsersWithoutProfile: 0,
      statusCount: 6,
    };
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: health, error: null }),
    };

    await expect(readBeginnerFlowHealth(client as never)).resolves.toEqual(
      health,
    );
  });

  it("fails closed when the RPC result is missing or malformed", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: { healthy: true }, error: null }),
    };

    await expect(readBeginnerFlowHealth(client as never)).resolves.toBeNull();
  });
});
