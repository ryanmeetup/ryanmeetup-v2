"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Tooltip } from "@ryanmeetup/ui";
import { FiCheck, FiPlus, FiShield } from "react-icons/fi";
import type { WorkspaceData } from "@/lib/types";
import { withAccessPreview } from "@/lib/access-preview";
import { ThemeToggle } from "@/components/global";
import { StatusSettingsModal } from "@/components/tasks/TaskAdministration";
import { HeaderProfileControls } from "./HeaderProfileControls";

export function TaskHeaderActions({
  data,
  setData,
  demoMode,
  onNewTask,
}: {
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
  onNewTask?: () => void;
}) {
  const [statusesOpen, setStatusesOpen] = useState(false);
  const isPreviewing = Boolean(data.accessPreview);
  const isOwner =
    !isPreviewing && (demoMode || data.currentProfile.app_role === "owner");
  return (
    <>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {isOwner && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<FiCheck />}
            onClick={() => setStatusesOpen(true)}
          >
            Statuses
          </Button>
        )}
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
        {isPreviewing ? (
          <Tooltip content="Exit access preview to create a new task">
            <Button size="sm" leftIcon={<FiPlus />} disabled>
              New task
            </Button>
          </Tooltip>
        ) : onNewTask ? (
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
        )}
        <ThemeToggle />
        <HeaderProfileControls
          profile={data.currentProfile}
          demoMode={demoMode}
        />
      </div>
      {isOwner && (
        <StatusSettingsModal
          open={statusesOpen}
          setOpen={setStatusesOpen}
          data={data}
          setData={setData}
          demoMode={demoMode}
        />
      )}
    </>
  );
}
