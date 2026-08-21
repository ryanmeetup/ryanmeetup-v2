import type {
  ResourceAttachment,
  ResourceLink,
} from "@/lib/resources/resource-types";
import type { Profile } from "@/lib/workspace/workspace-types";

export type ResourceAttachmentDraft = ResourceAttachment & { file?: File };

export type ArchiveFilter = "active" | "archived" | "all";

export function archiveFilter(value: string): ArchiveFilter {
  return value === "archived" || value === "all" ? value : "active";
}

export function filterAndSortResources<
  T extends { archived_at: string | null; name: string },
>(resources: T[], filter: ArchiveFilter) {
  return [...resources]
    .filter(
      (resource) =>
        filter === "all" ||
        (filter === "archived"
          ? Boolean(resource.archived_at)
          : !resource.archived_at),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resourceSearchText(resource: {
  name: string;
  description: string | null;
  links?: ResourceLink[] | null;
}) {
  const links = (resource.links ?? [])
    .map((link) => `${link.label} ${link.url}`)
    .join(" ");
  return `${resource.name} ${resource.description ?? ""} ${links}`.toLowerCase();
}

export function sameIds(left: string[], right: string[]) {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  );
}

export function profileSelectOptions(profiles: Profile[]) {
  return profiles.map((profile) => ({
    avatar: { name: profile.full_name, src: profile.avatar_url },
    label: profile.full_name,
    value: profile.id,
  }));
}

export async function uploadResourceAttachments({
  attachments,
  resourceId,
  resourceKind,
}: {
  attachments: ResourceAttachmentDraft[];
  resourceId: string;
  resourceKind: "category" | "project";
}) {
  const idKey = `${resourceKind}Id`;
  let failures = 0;
  for (const attachment of attachments) {
    try {
      const body = attachment.file
        ? (() => {
            const formData = new FormData();
            formData.set(idKey, resourceId);
            formData.set("file", attachment.file);
            return formData;
          })()
        : JSON.stringify({
            [idKey]: resourceId,
            name: attachment.name,
            body: attachment.body,
          });
      const response = await fetch(`/api/${resourceKind}-attachments`, {
        method: "POST",
        headers: attachment.file
          ? undefined
          : { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) failures += 1;
    } catch {
      failures += 1;
    }
  }
  return failures;
}
