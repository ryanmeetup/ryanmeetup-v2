"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Input, Textarea } from "@ryanmeetup/ui";
import { ResourceOwnerSelect } from "@/components/global";
import type { Profile } from "@/lib/workspace-types";
import type { ResourceLink } from "@/lib/resource-types";
import type { ResourceAttachmentDraft } from "@/lib/resource-management";
import { ResourceAttachments } from "./ResourceAttachments";
import { ResourceLinksFields } from "./ResourceLinksFields";

export type ResourceFieldsProps = {
  resource: { kind: "category" | "project"; id?: string };
  values: {
    name: string;
    description: string;
    ownerIds: string[];
    links: ResourceLink[];
    attachments?: ResourceAttachmentDraft[];
  };
  changes: {
    setName: (value: string) => void;
    setDescription: (value: string) => void;
    setOwnerIds: (value: string[]) => void;
    setLinks: Dispatch<SetStateAction<ResourceLink[]>>;
    setAttachments?: (value: ResourceAttachmentDraft[]) => void;
  };
  editor: {
    disabled: boolean;
    demoMode: boolean;
    currentUserId: string;
    profiles: Profile[];
  };
  copy: {
    nameLabel: string;
    namePlaceholder: string;
    descriptionPlaceholder: string;
    descriptionRequired?: boolean;
  };
  section?: "all" | "primary" | "supporting";
  primarySlot?: ReactNode;
  secondarySlot?: ReactNode;
};

export function ResourceFields({ resource, values, changes, editor, copy, section = "all", primarySlot, secondarySlot }: ResourceFieldsProps) {
  const prefix = resource.id ? `${resource.kind}-${resource.id}` : resource.kind;
  return <>
    {section !== "supporting" && <>
      <Input label={copy.nameLabel} name={`${prefix}-name`} value={values.name} onChange={(event) => changes.setName(event.target.value)} placeholder={copy.namePlaceholder} disabled={editor.disabled} required />
      <Textarea id={`${prefix}-description`} label="Description" name={`${prefix}-description`} value={values.description} onChange={(event) => changes.setDescription(event.target.value)} placeholder={copy.descriptionPlaceholder} rows={3} disabled={editor.disabled} required={copy.descriptionRequired !== false} />
      {primarySlot}
      <ResourceOwnerSelect label={`${resource.kind === "project" ? "Project" : "Category"} owners`} profiles={editor.profiles} value={values.ownerIds} onChange={changes.setOwnerIds} disabled={editor.disabled} />
    </>}
    {section !== "primary" && <>
      <ResourceLinksFields links={values.links} setLinks={changes.setLinks} disabled={editor.disabled} namePrefix={prefix} />
      <ResourceAttachments resource={resource} editor={{ demoMode: editor.demoMode, disabled: editor.disabled, currentUserId: editor.currentUserId }} {...(values.attachments && changes.setAttachments ? { draftState: { drafts: values.attachments, onChange: changes.setAttachments } } : {})} />
      {secondarySlot}
    </>}
  </>;
}
