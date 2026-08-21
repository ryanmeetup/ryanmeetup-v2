"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { AnimatedCollapse, IconButton, Pill } from "@ryanmeetup/ui";
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiUser,
  FiZap,
} from "react-icons/fi";
import { withAccessPreview } from "@/lib/access/access-preview";
import { changelogReleasePath, type ChangelogRelease } from "@/lib/changelog";
import type { AccessPreview } from "@/lib/workspace/workspace-types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function LatestChangelogCard({
  preview,
  release,
}: {
  preview?: AccessPreview;
  release: ChangelogRelease;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const contentId = useId();
  const actionsId = useId();

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const keepDesktopExpanded = (event: MediaQueryListEvent) => {
      if (event.matches) setCollapsed(false);
    };

    desktopQuery.addEventListener("change", keepDesktopExpanded);
    return () =>
      desktopQuery.removeEventListener("change", keepDesktopExpanded);
  }, []);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-50/80 px-5 pb-4 pt-5 shadow-sm dark:border-emerald-300/20 dark:bg-emerald-400/[0.08] sm:px-6 sm:pb-5 sm:pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-300/[0.06]"
      />
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 sm:gap-5 lg:gap-y-0">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/15 text-xl text-emerald-700 shadow-sm dark:border-emerald-300/10 dark:bg-emerald-300/15 dark:text-emerald-200">
          <FiZap aria-hidden />
        </span>

        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {release.title}
            <Pill
              size="sm"
              className="!border-emerald-500/30 !bg-emerald-500/10 !px-2 !py-0.5 !text-[9px] !tracking-[0.18em] !text-emerald-800 dark:!text-emerald-200"
            >
              {release.version}
            </Pill>
          </h2>
          <AnimatedCollapse id={contentId} open={!collapsed}>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/55 dark:text-white/55">
                <FiCalendar
                  aria-hidden
                  className="text-black/35 dark:text-white/35"
                />
                {dateFormatter.format(new Date(`${release.date}T12:00:00Z`))}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/55 dark:text-white/55">
                <FiUser
                  aria-hidden
                  className="text-black/35 dark:text-white/35"
                />
                {release.author}
              </span>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-black/65 dark:text-white/65">
              {release.summary}
            </p>
          </AnimatedCollapse>
        </div>

        <IconButton
          label={`${collapsed ? "Expand" : "Collapse"} changelog`}
          size="sm"
          className="lg:hidden"
          aria-controls={`${contentId} ${actionsId}`}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}
        >
          <FiChevronDown
            className={`transition-transform duration-200 motion-reduce:transition-none ${collapsed ? "-rotate-90" : ""}`}
          />
        </IconButton>

        <AnimatedCollapse
          id={actionsId}
          open={!collapsed}
          className="col-start-2 col-end-4 lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:self-center"
        >
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
            <Link
              href={withAccessPreview(changelogReleasePath(release), preview)}
              className="group inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600/25 bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 motion-reduce:transform-none dark:border-emerald-200/20 dark:bg-emerald-200 dark:text-emerald-950 dark:hover:bg-emerald-100"
            >
              <FiBookOpen aria-hidden />
              Read {release.version}
              <FiArrowRight
                className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden
              />
            </Link>
            <Link
              href={withAccessPreview("/changelog", preview)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600/25 bg-white/60 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-600/40 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 motion-reduce:transform-none dark:border-emerald-200/20 dark:bg-white/[0.06] dark:text-emerald-100 dark:hover:bg-white/10"
            >
              <FiClock aria-hidden />
              All releases
            </Link>
          </div>
        </AnimatedCollapse>
      </div>
    </article>
  );
}
