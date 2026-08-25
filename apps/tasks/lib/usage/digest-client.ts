import type { DigestSettings } from "@/lib/digest/digest-settings";
import type { DigestRunResult } from "@/lib/usage/digest-run-types";

const message = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
};

/** Persist a partial cadence change. Resolves to the saved settings. */
export async function saveDigestSettings(
  patch: Partial<DigestSettings>,
): Promise<DigestSettings> {
  const response = await fetch("/api/digest-settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok)
    throw new Error(
      await message(response, "The digest settings could not be saved."),
    );
  const body = (await response.json()) as { settings: DigestSettings };
  return body.settings;
}

/** Run the digest now, outside the schedule. */
export async function runDigestNow(): Promise<DigestRunResult> {
  const response = await fetch("/api/digest-runs", { method: "POST" });
  if (!response.ok)
    throw new Error(await message(response, "The digest could not be run."));
  return (await response.json()) as DigestRunResult;
}
