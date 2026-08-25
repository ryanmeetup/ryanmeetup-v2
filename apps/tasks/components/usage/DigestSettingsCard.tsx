"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Heading, Kicker, Pill, toast } from "@ryanmeetup/ui";
import { FiClock, FiLayers, FiSend } from "react-icons/fi";
import {
  DIGEST_SECTION_META,
  describeCadence,
  nextDigestRun,
  type DigestSettings,
} from "@/lib/digest/digest-settings";
import { runDigestNow } from "@/lib/usage/digest-client";
import { DigestCadenceModal } from "./DigestCadenceModal";
import { DigestStructureModal } from "./DigestStructureModal";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function Detail({ label, children }: { label: string; children: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{children}</dd>
    </div>
  );
}

export function DigestSettingsCard({
  settings,
  setSettings,
  demoMode,
}: {
  settings: DigestSettings;
  setSettings: (settings: DigestSettings) => void;
  demoMode: boolean;
}) {
  const [cadenceOpen, setCadenceOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [, startRefresh] = useTransition();
  const router = useRouter();

  const next = nextDigestRun(settings, new Date());

  const sendNow = async () => {
    if (demoMode) {
      toast.success("Demo mode does not send email.");
      return;
    }
    setSending(true);
    try {
      const result = await runDigestNow();
      if (result.outcome === "sent")
        toast.success(
          `Scheduled ${result.scheduled} digest${result.scheduled === 1 ? "" : "s"} for ${dateTimeFormatter.format(new Date(result.deliverAt!))}.`,
        );
      else if (result.outcome === "empty")
        toast.success("Nobody has actionable work right now, so nothing sent.");
      else if (result.outcome === "off_schedule")
        toast.error(
          result.detail ?? "A digest has already gone out for today.",
        );
      else
        toast.error(result.detail ?? "The digest could not be sent.");
      startRefresh(() => router.refresh());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The digest could not be run.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card variant="solid">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Kicker>Workload digest</Kicker>
            <Heading size="h3" className="mt-2 text-2xl">
              {describeCadence(settings)}
            </Heading>
          </div>
          <Pill
            size="sm"
            variant="subtle"
            className={
              settings.enabled
                ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                : "border-amber-500/35 bg-amber-500/15 text-amber-900 dark:text-amber-100"
            }
          >
            {settings.enabled ? "Active" : "Paused"}
          </Pill>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Detail label="Next send">
            {next ? dateTimeFormatter.format(next) : "Not scheduled"}
          </Detail>
          <Detail label="Review window">
            {`${settings.reviewMinutes} minutes before delivery`}
          </Detail>
          <Detail label="Sections">
            {settings.sections
              .map((key) => DIGEST_SECTION_META[key].label)
              .join(" · ")}
          </Detail>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FiClock />}
            onClick={() => setCadenceOpen(true)}
          >
            Edit cadence
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FiLayers />}
            onClick={() => setStructureOpen(true)}
          >
            Edit structure
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FiSend />}
            loading={sending}
            loadingText="Sending..."
            onClick={() => void sendNow()}
          >
            Send now
          </Button>
        </div>
        <p className="mt-3 text-xs text-black/55 dark:text-white/55">
          The worker checks these settings every hour, so a change applies to
          the next run without a deploy. &ldquo;Send now&rdquo; ignores the
          schedule but still refuses to send a second digest on a day one has
          already gone out.
        </p>
      </Card>

      <DigestCadenceModal
        open={cadenceOpen}
        setOpen={setCadenceOpen}
        settings={settings}
        demoMode={demoMode}
        onSaved={setSettings}
      />
      <DigestStructureModal
        open={structureOpen}
        setOpen={setStructureOpen}
        settings={settings}
        demoMode={demoMode}
        onSaved={setSettings}
      />
    </>
  );
}
