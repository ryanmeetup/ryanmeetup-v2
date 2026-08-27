import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type BeginnerFlowHealth = {
  healthy: boolean;
  contractOk: boolean;
  profileTriggerActive: boolean;
  defaultTierCount: number;
  profileCount: number;
  profilesWithoutTier: number;
  authUsersWithoutProfile: number;
  statusCount: number;
};

function isHealth(value: unknown): value is BeginnerFlowHealth {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const health = value as Record<string, unknown>;
  return (
    typeof health.healthy === "boolean" &&
    typeof health.contractOk === "boolean" &&
    typeof health.profileTriggerActive === "boolean" &&
    typeof health.defaultTierCount === "number" &&
    typeof health.profileCount === "number" &&
    typeof health.profilesWithoutTier === "number" &&
    typeof health.authUsersWithoutProfile === "number" &&
    typeof health.statusCount === "number"
  );
}

export async function readBeginnerFlowHealth(
  client: SupabaseClient,
): Promise<BeginnerFlowHealth | null> {
  const { data, error } = await client.rpc("beginner_flow_health");
  return error || !isHealth(data) ? null : data;
}
