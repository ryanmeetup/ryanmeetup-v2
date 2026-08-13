"use client";

import { useState } from "react";
import type { ResourceLink } from "@/lib/resource-types";
import type { ResourceAttachmentDraft } from "@/lib/resource-management";

export function useResourceModalState(currentUserId: string) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [attachments, setAttachments] = useState<ResourceAttachmentDraft[]>([]);
  const [ownerIds, setOwnerIds] = useState<string[]>([currentUserId]);
  const [creating, setCreating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function reset() {
    setName("");
    setDescription("");
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
