"use client";

import Link from "next/link";
import { Avatar, IconButton, Tooltip } from "@ryanmeetup/ui";
import { FiLogOut } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function HeaderProfileControls({
  demoMode,
  profile,
}: {
  demoMode: boolean;
  profile: Profile;
}) {
  const name = profile.full_name || "Teammate";
  const summary = (
    <>
      <Avatar name={name} src={profile.avatar_url} />
      <span className="hidden min-w-0 2xl:block">
        <span className="block max-w-36 truncate text-sm font-semibold">
          {name}
        </span>
        <span className="block text-[10px] uppercase tracking-widest text-black/45 dark:text-white/45">
          {profile.app_role === "owner" ? "Owner" : "Team member"}
          {demoMode ? " · Demo" : ""}
        </span>
      </span>
    </>
  );

  return (
    <div className="flex shrink-0 items-center gap-2 border-l border-black/10 pl-2 dark:border-white/10 sm:pl-3">
      {demoMode ? (
        <div className="flex min-w-0 items-center gap-2">{summary}</div>
      ) : (
        <Tooltip content="View profile">
          <Link
            href="/profile"
            aria-label={`View ${name}'s profile`}
            className="flex min-w-0 items-center gap-2 rounded-lg transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/40 2xl:px-2 2xl:py-1"
          >
            {summary}
          </Link>
        </Tooltip>
      )}
      {!demoMode && (
        <IconButton
          label="Sign out"
          onClick={async () => {
            await createClient().auth.signOut();
            window.location.href = "/login";
          }}
        >
          <FiLogOut />
        </IconButton>
      )}
    </div>
  );
}
