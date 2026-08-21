"use client";
import { mutate } from "@/lib/mutation-client";

export function accessMutation<T>(body: Record<string, unknown>) {
  return mutate<T>("/api/access-groups", { method: "POST", body: JSON.stringify(body) });
}
