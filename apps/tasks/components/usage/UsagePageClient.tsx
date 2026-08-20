"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Heading, Kicker, Pill, Text } from "@ryanmeetup/ui";
import {
  FiActivity,
  FiCheckCircle,
  FiInfo,
  FiMail,
  FiRefreshCw,
} from "react-icons/fi";
import { WorkspacePageShell } from "@/components/global";
import type { ResendQuota, ResendUsage } from "@/lib/server/resend-usage";
import type { WorkspaceData } from "@/lib/workspace-types";
import { RecentEmailTable } from "./RecentEmailTable";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function QuotaCard({
  label,
  quota,
}: {
  label: string;
  quota: ResendQuota | null;
}) {
  if (!quota) {
    return (
      <Card variant="solid" className="h-full">
        <Kicker>{label}</Kicker>
        <Heading size="h3" className="mt-3 text-3xl">
          Unavailable
        </Heading>
        <Text className="mt-2 text-sm">
          This quota was not included in Resend’s response.
        </Text>
      </Card>
    );
  }

  const percent = Math.min(100, Math.round((quota.used / quota.limit) * 100));
  const remaining = Math.max(0, quota.limit - quota.used);
  const barColor =
    percent >= 95
      ? "bg-red-500"
      : percent >= 85
        ? "bg-amber-500"
        : "bg-emerald-500";
  const usageBadgeColor =
    percent >= 95
      ? "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300"
      : percent >= 85
        ? "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";

  return (
    <Card variant="solid" className="h-full">
      <div className="flex items-center justify-between gap-3">
        <Kicker>{label}</Kicker>
        <span className="flex flex-wrap justify-end gap-2">
          {quota.estimated && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-200">
              <FiInfo aria-hidden /> Estimated
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${usageBadgeColor}`}
          >
            {percent}% used
          </span>
        </span>
      </div>
      <Heading size="h3" className="mt-3 text-4xl">
        {remaining.toLocaleString()}
      </Heading>
      <Text className="mt-1 text-sm">
        emails remaining of {quota.limit.toLocaleString()}
      </Text>
      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
        role="progressbar"
        aria-label={`${label} Resend quota used`}
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-valuenow={Math.min(quota.used, quota.limit)}
      >
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-black/60 dark:text-white/60">
        {quota.used.toLocaleString()} used
        {quota.estimated ? " from outbound history" : ""}
      </p>
    </Card>
  );
}

export function UsagePageClient({
  initialData,
  demoMode,
  usage,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  usage: ResendUsage;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const router = useRouter();
  const statusLabel =
    usage.status === "available"
      ? "Connected"
      : usage.status === "unconfigured"
        ? "Setup needed"
        : "Unavailable";

  return (
    <WorkspacePageShell
      data={data}
      demoMode={demoMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      setData={setData}
      contentClassName="p-4 sm:p-6 lg:p-8"
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Heading size="h1" className="flex items-center gap-2 text-4xl">
              <FiActivity aria-hidden /> Usage
            </Heading>
            <Text className="mt-1 text-sm">
              Keep an eye on the services powering the workspace.
            </Text>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            leftIcon={
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            }
            disabled={refreshing}
            onClick={() => startRefresh(() => router.refresh())}
          >
            {refreshing ? "Refreshing" : "Refresh usage"}
          </Button>
        </div>

        <section aria-labelledby="resend-heading" className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <FiMail aria-hidden />
            </span>
            <div>
              <Heading
                id="resend-heading"
                size="h2"
                variant="normal"
                bold
                className="text-xl"
              >
                Resend
              </Heading>
              <p className="text-sm text-black/60 dark:text-white/60">
                Transactional email
              </p>
            </div>
            {usage.status === "available" ? (
              <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-200">
                <FiCheckCircle aria-hidden className="h-4 w-4" /> Connected
              </span>
            ) : (
              <Pill size="sm" variant="subtle" className="ml-auto">
                {statusLabel}
              </Pill>
            )}
          </div>

          {usage.message && (
            <div
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
              role="status"
            >
              {usage.message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <QuotaCard label="Today" quota={usage.daily} />
            <QuotaCard label="This month" quota={usage.monthly} />
          </div>

          <RecentEmailTable emails={usage.recentEmails} />
          <p className="text-xs text-black/50 dark:text-white/50">
            Last checked {dateTimeFormatter.format(new Date(usage.checkedAt))}.
            Resend counts every To, CC, and BCC recipient toward email quota.
          </p>
        </section>
      </div>
    </WorkspacePageShell>
  );
}
