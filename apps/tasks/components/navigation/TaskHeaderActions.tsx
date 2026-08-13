"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Avatar,
  DropdownMenu,
  DropdownMenuButton,
  DropdownMenuItem,
  DropdownMenuItems,
  DropdownMenuSeparator,
  Tooltip,
} from "@ryanmeetup/ui";
import {
  FiCheck,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiPlus,
  FiShield,
  FiSun,
  FiUser,
} from "react-icons/fi";
import type { WorkspaceData } from "@/lib/workspace-types";
import { ThemeToggle, useTheme } from "@/components/global";
import { NewTaskModal, StatusSettingsModal } from "@/components/tasks";
import { HeaderProfileControls } from "./HeaderProfileControls";
import { createClient } from "@/lib/supabase/client";
import { profileDisplayName } from "@/lib/presentation";

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
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isPreviewing = Boolean(data.accessPreview);
  const isOwner =
    !isPreviewing && (demoMode || data.currentProfile.app_role === "owner");
  const profileName = profileDisplayName(data.currentProfile);
  return (
    <>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        {isOwner && (
          <span className="hidden items-center gap-3 xl:flex">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<FiCheck />}
              onClick={() => setStatusesOpen(true)}
            >
              Statuses
            </Button>
            <Button.Link
              href="/access"
              variant="secondary"
              size="sm"
              leftIcon={<FiShield />}
            >
              Access
            </Button.Link>
          </span>
        )}
        <span className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuButton
              unstyled
              aria-label="Open account and workspace settings"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
            >
              <FiMenu aria-hidden />
            </DropdownMenuButton>
            <DropdownMenuItems align="end">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <Avatar
                  name={profileName}
                  src={data.currentProfile.avatar_url}
                  size="md"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {profileName}
                  </span>
                  <span className="block text-[10px] uppercase tracking-widest text-black/45 dark:text-white/45">
                    {data.currentProfile.app_role === "owner"
                      ? "Owner"
                      : "Team member"}
                    {demoMode ? " · Demo" : ""}
                  </span>
                </span>
              </div>
              <DropdownMenuSeparator />
              {!demoMode && (
                <>
                  <div
                    id="mobile-account-menu-account"
                    className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45"
                  >
                    Account
                  </div>
                  <div
                    role="group"
                    aria-labelledby="mobile-account-menu-account"
                  >
                    {!isPreviewing && (
                      <DropdownMenuItem onClick={() => router.push("/profile")}>
                        <FiUser aria-hidden /> View profile
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={async () => {
                        await createClient().auth.signOut();
                        router.replace("/login");
                        router.refresh();
                      }}
                    >
                      <FiLogOut aria-hidden /> Sign out
                    </DropdownMenuItem>
                  </div>
                </>
              )}
              {isOwner && (
                <>
                  {!demoMode && <DropdownMenuSeparator />}
                  <div
                    id="mobile-account-menu-admin"
                    className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45"
                  >
                    Admin
                  </div>
                  <div
                    role="group"
                    aria-labelledby="mobile-account-menu-admin"
                  >
                    <DropdownMenuItem onClick={() => setStatusesOpen(true)}>
                      <FiCheck aria-hidden /> Statuses
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/access")}>
                      <FiShield aria-hidden /> Access
                    </DropdownMenuItem>
                  </div>
                </>
              )}
              <DropdownMenuSeparator />
              <div
                id="mobile-account-menu-preferences"
                className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45"
              >
                Preferences
              </div>
              <div
                role="group"
                aria-labelledby="mobile-account-menu-preferences"
              >
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <FiSun aria-hidden />
                  ) : (
                    <FiMoon aria-hidden />
                  )}
                  Use {theme === "dark" ? "light" : "dark"} theme
                </DropdownMenuItem>
              </div>
            </DropdownMenuItems>
          </DropdownMenu>
        </span>
        {isOwner && (
          <span className="hidden sm:inline-flex xl:hidden">
            <DropdownMenu>
              <DropdownMenuButton
                unstyled
                aria-label="Open workspace settings"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
              >
                <FiMenu aria-hidden />
              </DropdownMenuButton>
              <DropdownMenuItems align="end">
                <DropdownMenuItem onClick={() => setStatusesOpen(true)}>
                  <FiCheck aria-hidden /> Statuses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/access")}>
                  <FiShield aria-hidden /> Access
                </DropdownMenuItem>
              </DropdownMenuItems>
            </DropdownMenu>
          </span>
        )}
        {isPreviewing ? (
          <Tooltip content="Exit access preview to create a new task">
            <Button
              size="sm"
              leftIcon={<FiPlus />}
              disabled
              aria-label="New task"
              className="gap-0 px-3 [&>span:last-child]:hidden sm:gap-2 sm:px-4 sm:[&>span:last-child]:inline"
            >
              New task
            </Button>
          </Tooltip>
        ) : onNewTask ? (
          <Button
            size="sm"
            leftIcon={<FiPlus />}
            onClick={onNewTask}
            aria-label="New task"
            className="gap-0 px-3 [&>span:last-child]:hidden sm:gap-2 sm:px-4 sm:[&>span:last-child]:inline"
          >
            New task
          </Button>
        ) : (
          <Button
            size="sm"
            leftIcon={<FiPlus />}
            onClick={() => setNewTaskOpen(true)}
            aria-label="New task"
            className="gap-0 px-3 [&>span:last-child]:hidden sm:gap-2 sm:px-4 sm:[&>span:last-child]:inline"
          >
            New task
          </Button>
        )}
        <span className="hidden sm:inline-flex">
          <ThemeToggle />
        </span>
        <span className="hidden sm:inline-flex">
          <HeaderProfileControls
            profile={data.currentProfile}
            demoMode={demoMode}
            previewing={isPreviewing}
          />
        </span>
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
      {!onNewTask && !isPreviewing && (
        <NewTaskModal
          data={data}
          demoMode={demoMode}
          open={newTaskOpen}
          setData={setData}
          setOpen={setNewTaskOpen}
        />
      )}
    </>
  );
}
