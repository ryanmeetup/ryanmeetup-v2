"use client";

import type { FormEvent } from "react";
import { Button, ConfirmationDialog, Input, Modal } from "@ryanmeetup/ui";
import type { Profile } from "@/lib/workspace/workspace-types";

export function InviteTeammateModal({
  email,
  name,
  onEmailChange,
  onNameChange,
  onSubmit,
  open,
  pending,
  setOpen,
}: {
  email: string;
  name: string;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  open: boolean;
  pending: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      setIsOpen={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
      title="Invite Teammate"
      size="md"
      hideActions
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="invite-teammate-form"
            size="sm"
            loading={pending}
            loadingText="Inviting..."
          >
            Send invitation
          </Button>
        </div>
      }
    >
      <form
        id="invite-teammate-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={onSubmit}
      >
        <Input
          label="Name"
          name="invite-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="New Ryan"
          disabled={pending}
        />
        <Input
          label="Email"
          name="invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="ryan@example.com"
          disabled={pending}
        />
      </form>
    </Modal>
  );
}

export function RemoveTeammateDialog({
  onConfirm,
  pending,
  profile,
  setProfile,
}: {
  onConfirm: () => void;
  pending: boolean;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}) {
  return (
    <ConfirmationDialog
      open={Boolean(profile)}
      setOpen={(open) => {
        if (!open && !pending) setProfile(null);
      }}
      title="Remove Teammate?"
      description={
        profile
          ? `Remove ${profile.full_name} and revoke their workspace access?`
          : ""
      }
      confirmLabel="Remove Teammate"
      pendingLabel="Removing..."
      pending={pending}
      destructive
      onConfirm={onConfirm}
    />
  );
}
