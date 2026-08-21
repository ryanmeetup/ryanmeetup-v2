"use client";

import { useState } from "react";
import type { ResourceLink } from "@/lib/resources/resource-types";
import type { ResourceAttachmentDraft } from "@/lib/resources/resource-management";

export function useResourceModalState(
  currentUserId: string,
  initial?: { name?: string; description?: string },
) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [attachments, setAttachments] = useState<ResourceAttachmentDraft[]>([]);
  const [ownerIds, setOwnerIds] = useState<string[]>([currentUserId]);
  const [creating, setCreating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function reset() {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setLinks([]);
    setAttachments([]);
    setOwnerIds([currentUserId]);
    setDetailsOpen(false);
  }

  return {
    draft: { name, description, links, attachments, ownerIds },
    changes: { setName, setDescription, setLinks, setAttachments, setOwnerIds },
    creating,
    setCreating,
    detailsOpen,
    setDetailsOpen,
    reset,
  };
}
