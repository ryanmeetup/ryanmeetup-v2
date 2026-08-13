"use client";

import { useState } from "react";
import type { ResourceLink } from "@/lib/resource-types";

export type EditableResource = {
  id: string;
  name: string;
  description: string | null;
  links: ResourceLink[];
};

export function useResourceEditState(initial?: EditableResource | null, initialOwnerIds: string[] = []) {
  const [resourceId, setResourceId] = useState<string | null>(initial?.id ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [links, setLinks] = useState<ResourceLink[]>(initial?.links ?? []);
  const [ownerIds, setOwnerIds] = useState(initialOwnerIds);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function begin(resource: EditableResource, nextOwnerIds: string[]) {
    setDetailsOpen(false);
    setResourceId(resource.id);
    setName(resource.name);
    setDescription(resource.description ?? "");
    setLinks(resource.links ?? []);
    setOwnerIds(nextOwnerIds);
  }

  function close() {
    if (saving) return false;
    setDetailsOpen(false);
    setResourceId(null);
    return true;
  }

  return {
    resourceId,
    setResourceId,
    draft: { name, description, links, ownerIds },
    changes: { setName, setDescription, setLinks, setOwnerIds },
    detailsOpen,
    setDetailsOpen,
    saving,
    setSaving,
    begin,
    close,
  };
}
