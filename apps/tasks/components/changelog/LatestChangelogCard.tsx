"use client";

import { useId, useState } from "react";
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
import { withAccessPreview } from "@/lib/access-preview";
import { changelogReleasePath, latestChangelogRelease } from "@/lib/changelog";
import type { AccessPreview } from "@/lib/workspace-types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function LatestChangelogCard({ preview }: { preview?: AccessPreview }) {
  const [collapsed, setCollapsed] = useState(false);
  const contentId = useId();
  const actionsId = useId();

  return (
    <article className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-50/80 p-5 shadow-sm dark:border-emerald-300/20 dark:bg-emerald-400/[0.08] sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-300/[0.06]"
      />
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/15 text-xl text-emerald-700 shadow-sm dark:border-emerald-300/10 dark:bg-emerald-300/15 dark:text-emerald-200">
          <FiZap aria-hidden />
        </span>

        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {latestChangelogRelease.title}
            <Pill
              size="sm"
              className="!border-emerald-500/30 !bg-emerald-500/10 !px-2 !py-0.5 !text-[9px] !tracking-[0.18em] !text-emerald-800 dark:!text-emerald-200"
            >
              {latestChangelogRelease.version}
            </Pill>
            <IconButton
              label={`${collapsed ? "Expand" : "Collapse"} changelog`}
              size="sm"
              aria-controls={`${contentId} ${actionsId}`}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((current) => !current)}
            >
              <FiChevronDown
                className={`transition-transform duration-200 motion-reduce:transition-none ${collapsed ? "-rotate-90" : ""}`}
              />
            </IconButton>
          </h2>
          <AnimatedCollapse id={contentId} open={!collapsed}>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/55 dark:text-white/55">
                <FiCalendar
                  aria-hidden
                  className="text-black/35 dark:text-white/35"
                />
                {dateFormatter.format(
                  new Date(`${latestChangelogRelease.date}T12:00:00Z`),
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/55 dark:text-white/55">
                <FiUser
                  aria-hidden
                  className="text-black/35 dark:text-white/35"
                />
                {latestChangelogRelease.author}
              </span>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-black/65 dark:text-white/65">
              {latestChangelogRelease.summary}
            </p>
          </AnimatedCollapse>
        </div>

        <AnimatedCollapse
          id={actionsId}
          open={!collapsed}
          className="col-start-2 lg:col-start-auto lg:self-center"
        >
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
            <Link
              href={withAccessPreview(
                changelogReleasePath(latestChangelogRelease),
                preview,
              )}
              className="group inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600/25 bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 motion-reduce:transform-none dark:border-emerald-200/20 dark:bg-emerald-200 dark:text-emerald-950 dark:hover:bg-emerald-100"
            >
              <FiBookOpen aria-hidden />
              Read {latestChangelogRelease.version}
              <FiArrowRight
                className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden
              />
            </Link>
            <Link
              href={withAccessPreview("/changelog", preview)}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-black/55 transition hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/40"
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
