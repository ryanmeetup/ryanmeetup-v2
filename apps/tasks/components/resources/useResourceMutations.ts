"use client";

import { mutate } from "@/lib/mutation-client";
import type { Category, Project } from "@/lib/resource-types";
import { uploadResourceAttachments, type ResourceAttachmentDraft } from "@/lib/resource-management";

type ResourceByKind = { category: Category; project: Project };

export function useResourceMutations<K extends keyof ResourceByKind>(kind: K) {
  async function save(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    return mutate<{ [P in K]?: ResourceByKind[K] }>(`/api/${kind === "category" ? "categories" : "projects"}`, {
      method,
      body: JSON.stringify(body),
    });
  }

  async function uploadDrafts(attachments: ResourceAttachmentDraft[], resourceId: string) {
    return uploadResourceAttachments({ attachments, resourceId, resourceKind: kind });
  }

  return { save, uploadDrafts };
}
