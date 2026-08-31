import type { ProjectLink } from "@/lib/resources/resource-types";
import { normalizeHttpUrl } from "@ryanmeetup/utils";
import { objectWithKeys, requiredTrimmedText } from "./shared";

export function projectLinks(value: unknown): ProjectLink[] | null {
  if (!Array.isArray(value) || value.length > 10) return null;
  const links: ProjectLink[] = [];
  for (const item of value) {
    const body = objectWithKeys(item, ["label", "url"]);
    const label = body && requiredTrimmedText(body.label, 80);
    if (
      !body ||
      !label ||
      typeof body.url !== "string" ||
      body.url.length > 2048
    )
      return null;
    const url = normalizeHttpUrl(body.url);
    if (!url) return null;
    links.push({ label, url });
  }
  return links;
}
