"use client";

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
  FiLogOut,
  FiMenu,
  FiMoon,
  FiPlus,
  FiSliders,
  FiSun,
  FiUser,
} from "react-icons/fi";
import type { Profile } from "@/lib/workspace/workspace-types";
import { ThemeToggle, useTheme } from "@/components/global";
import { ADMIN_ROOT } from "@/lib/admin/admin-routes";
import { HeaderProfileControls } from "./HeaderProfileControls";
import { createClient } from "@/lib/supabase/client";
import { profileDisplayName } from "@/lib/presentation";

export function TaskHeaderActions({
  profile,
  previewing,
  demoMode,
  onNewTask,
}: {
  profile: Profile;
  previewing: boolean;
  demoMode: boolean;
  onNewTask: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // Demo builds hide /admin entirely, so the entry points go with it.
  const isOwner =
    !previewing && !demoMode && profile.app_role === "owner";
  const profileName = profileDisplayName(profile);
  return (
    <>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        {isOwner && (
          <span className="hidden items-center gap-3 sm:flex">
            <Button.Link
              href={ADMIN_ROOT}
              variant="secondary"
              size="sm"
              leftIcon={<FiSliders />}
            >
              Admin
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
                  src={profile.avatar_url}
                  size="md"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {profileName}
                  </span>
                  <span className="block text-[10px] uppercase tracking-widest text-black/45 dark:text-white/45">
                    {profile.app_role === "owner"
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
                    {!previewing && (
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
                  <DropdownMenuSeparator />
                  <div
                    id="mobile-account-menu-admin"
                    className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45"
                  >
                    Admin
                  </div>
                  <div role="group" aria-labelledby="mobile-account-menu-admin">
                    <DropdownMenuItem onClick={() => router.push(ADMIN_ROOT)}>
                      <FiSliders aria-hidden /> Admin
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
        {previewing ? (
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
        ) : (
          <Button
            size="sm"
            leftIcon={<FiPlus />}
            onClick={onNewTask}
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
            profile={profile}
            demoMode={demoMode}
            previewing={previewing}
          />
        </span>
      </div>
    </>
  );
}
