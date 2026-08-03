"use client";

import { Button } from "@ryanmeetup/ui";
import { FiPlus, FiShield } from "react-icons/fi";
import type { WorkspaceData } from "@/lib/types";
import { withAccessPreview } from "@/lib/access-preview";
import { ThemeToggle } from "./ThemeToggle";

export function TaskHeaderActions({
  data,
  demoMode,
  onNewTask,
}: {
  data: WorkspaceData;
  demoMode: boolean;
  onNewTask?: () => void;
}) {
  const isPreviewing = Boolean(data.accessPreview);
  const isOwner =
    !isPreviewing && (demoMode || data.currentProfile.app_role === "owner");
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
      {isOwner && (
        <Button.Link
          href="/access"
          variant="secondary"
          size="sm"
          leftIcon={<FiShield />}
        >
          Access
        </Button.Link>
      )}
      {!isPreviewing && (onNewTask ? (
        <Button size="sm" leftIcon={<FiPlus />} onClick={onNewTask}>
          New task
        </Button>
      ) : (
        <Button.Link
          href={withAccessPreview("/?new-task=1", data.accessPreview)}
          size="sm"
          leftIcon={<FiPlus />}
        >
          New task
        </Button.Link>
      ))}
      <ThemeToggle />
    </div>
  );
}
