import Link from "next/link";
import { Pill, Tooltip } from "@ryanmeetup/ui";
import { FiCheckCircle, FiClock, FiShield, FiUsers } from "react-icons/fi";
import { accessGroupSlug } from "@/lib/access-groups";
import type { AccessGroup, UserAccessMetadata } from "@/lib/access-types";

const accountDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
});

function formatAccountDate(value: string | null) {
  return value ? accountDateFormatter.format(new Date(value)) : null;
}

export function TeamAccountStatus({
  metadata,
  compact = false,
}: {
  metadata?: UserAccessMetadata;
  compact?: boolean;
}) {
  const active = Boolean(metadata?.lastSignInAt);
  return (
    <Tooltip
      placement={compact ? "left" : "right"}
      content={
        <dl className="space-y-1">
          <div className="flex justify-between gap-4">
            <dt className="opacity-65">Last login</dt>
            <dd>
              {formatAccountDate(metadata?.lastSignInAt ?? null) ?? "Never"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-65">{active ? "Joined" : "Invite sent"}</dt>
            <dd>
              {formatAccountDate(
                active
                  ? (metadata?.createdAt ?? null)
                  : (metadata?.invitedAt ?? metadata?.createdAt ?? null),
              ) ?? "—"}
            </dd>
          </div>
        </dl>
      }
    >
      <span
        tabIndex={0}
        className={`inline-flex cursor-help items-center gap-1.5 rounded-full px-2 py-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30 ${compact ? "shrink-0 text-xs" : ""} ${
          active
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        }`}
      >
        {active ? <FiCheckCircle aria-hidden /> : <FiClock aria-hidden />}
        {active ? "Active" : "Invited"}
      </span>
    </Tooltip>
  );
}

export function TeamTaskStats({
  metadata,
  compact = false,
}: {
  metadata?: UserAccessMetadata;
  compact?: boolean;
}) {
  return (
    <>
      <dl
        className={`grid grid-cols-3 text-center ${compact ? "mt-4 gap-2" : "grid-cols-[repeat(3,6rem)] gap-1.5"}`}
      >
        <div
          className={`flex flex-col rounded-lg bg-blue-500/[0.08] px-2 text-blue-700 dark:text-blue-300 ${compact ? "py-2" : "py-1.5"}`}
        >
          <dt className="order-2 text-[9px] font-semibold uppercase tracking-wider opacity-75">
            Open
          </dt>
          <dd className="order-1 font-semibold">
            {metadata?.assignedOpen ?? 0}
          </dd>
        </div>
        <div
          className={`flex flex-col rounded-lg bg-emerald-500/[0.08] px-2 text-emerald-700 dark:text-emerald-300 ${compact ? "py-2" : "py-1.5"}`}
        >
          <dt className="order-2 text-[9px] font-semibold uppercase tracking-wider opacity-75">
            Done
          </dt>
          <dd className="order-1 font-semibold">
            {metadata?.assignedCompleted ?? 0}
          </dd>
        </div>
        <div
          className={`flex flex-col rounded-lg bg-amber-500/[0.08] px-2 text-amber-700 dark:text-amber-300 ${compact ? "py-2" : "py-1.5"}`}
        >
          <dt className="order-2 text-[9px] font-semibold uppercase tracking-wider opacity-75">
            Reported
          </dt>
          <dd className="order-1 font-semibold">{metadata?.reported ?? 0}</dd>
        </div>
      </dl>
      <dl
        className={`${compact ? "mt-2" : "mt-1.5"} flex justify-center gap-4 text-[10px] text-black/45 dark:text-white/45`}
      >
        <div className="flex items-baseline gap-1">
          <dt>Assigned:</dt>
          <dd className="font-medium tabular-nums">
            {metadata?.assigned ?? 0}
          </dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt>Created:</dt>
          <dd className="font-medium tabular-nums">{metadata?.created ?? 0}</dd>
        </div>
      </dl>
    </>
  );
}

export function TeamAccessGroups({
  groups,
  labeled = false,
}: {
  groups: AccessGroup[];
  labeled?: boolean;
}) {
  return (
    <div
      className={
        labeled
          ? "mt-4 flex-1 border-t border-black/10 pt-4 dark:border-white/10"
          : ""
      }
    >
      {labeled && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
          Access groups
        </p>
      )}
      {groups.length > 0 ? (
        <ul className={`flex flex-wrap gap-1.5 ${labeled ? "mt-2" : ""}`}>
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/access/${accessGroupSlug(group.name)}`}
                className="inline-flex rounded-md transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:brightness-125 dark:focus-visible:ring-white/30"
              >
                <Pill
                  variant="code"
                  size="md"
                  className={
                    group.kind === "tier"
                      ? "rounded-md border-violet-500/30 ring-1 ring-inset ring-violet-500/15"
                      : "rounded-full border-sky-500/30 ring-1 ring-inset ring-sky-500/15"
                  }
                  style={{
                    backgroundColor: `${group.color}14`,
                    borderColor: group.color,
                    color: group.color,
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {group.kind === "tier" ? (
                      <FiShield aria-hidden />
                    ) : (
                      <FiUsers aria-hidden />
                    )}
                    {group.name}
                  </span>
                </Pill>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={`${labeled ? "mt-2" : ""} text-sm text-black/45 dark:text-white/45`}
        >
          No access assigned
        </p>
      )}
    </div>
  );
}
