"use client";

import type { FormEvent } from "react";
import { Button, DropdownSelect, Input, Modal, Textarea } from "@ryanmeetup/ui";
import { ACCESS_GROUP_COLOR_OPTIONS } from "@/lib/access-groups";

export function CreateAccessGroupModal({
  color,
  description,
  grantsGlobalContent,
  hierarchyRank,
  kind,
  name,
  onSubmit,
  open,
  saving,
  setColor,
  setDescription,
  setGrantsGlobalContent,
  setHierarchyRank,
  setKind,
  setName,
  setOpen,
}: {
  color: string;
  description: string;
  grantsGlobalContent: boolean;
  hierarchyRank: string;
  kind: "tier" | "team";
  name: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  saving: boolean;
  setColor: (value: string) => void;
  setDescription: (value: string) => void;
  setGrantsGlobalContent: (value: boolean) => void;
  setHierarchyRank: (value: string) => void;
  setKind: (value: "tier" | "team") => void;
  setName: (value: string) => void;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      setIsOpen={(nextOpen) => {
        if (!saving) setOpen(nextOpen);
      }}
      title="New access group"
      size="md"
      hideActions
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-access-group-form"
            size="sm"
            loading={saving}
            loadingText="Creating..."
            disabled={!name.trim() || !color}
          >
            Create group
          </Button>
        </div>
      }
    >
      <form
        id="create-access-group-form"
        className="space-y-4"
        onSubmit={onSubmit}
      >
        <Input
          label="Group name"
          name="access-group-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Documentary Team"
          disabled={saving}
          autoFocus
          required
        />
        <DropdownSelect
          label="Group type"
          required
          variant="field"
          value={kind}
          onChange={(value) => setKind(value as "tier" | "team")}
          options={[
            { label: "Team", value: "team" },
            { label: "Organizational Tier", value: "tier" },
          ]}
          disabled={saving}
        />
        {kind === "tier" && (
          <>
            <Input
              label="Hierarchy rank"
              name="access-group-rank"
              type="number"
              min="0"
              value={hierarchyRank}
              onChange={(event) => setHierarchyRank(event.target.value)}
              disabled={saving}
              required
            />
            <p className="text-sm text-black/65 dark:text-white/65">
              Higher numbers inherit access granted to lower ranks.
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={grantsGlobalContent}
                onChange={(event) =>
                  setGrantsGlobalContent(event.target.checked)
                }
                disabled={saving}
              />
              <span>Grant manager access to all current and future work</span>
            </label>
          </>
        )}
        <DropdownSelect
          label="Color"
          variant="field"
          value={color}
          onChange={setColor}
          options={ACCESS_GROUP_COLOR_OPTIONS}
          disabled={saving}
          required
        />
        <Textarea
          id="access-group-description"
          label="Description"
          name="access-group-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Who belongs here and why?"
          disabled={saving}
        />
      </form>
    </Modal>
  );
}
