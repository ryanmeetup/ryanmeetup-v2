"use client";

import { useEffect } from "react";
import { useSearchFilter } from "@ryanmeetup/hooks";
import { Card, EmptyState, Input, Pagination, Pill } from "@ryanmeetup/ui";
import { FiLoader, FiSearch } from "react-icons/fi";
import { usePagination } from "@/hooks/usePagination";
import type { ResendEmailSummary } from "@/lib/server/resend-usage";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const eventLabels: Record<string, string> = {
  bounced: "Bounced",
  canceled: "Canceled",
  clicked: "Clicked",
  complained: "Complained",
  delivered: "Delivered",
  delivery_delayed: "Delayed",
  failed: "Failed",
  opened: "Opened",
  queued: "Queued",
  scheduled: "Scheduled",
  sent: "Sent",
  suppressed: "Suppressed",
};

const eventLabel = (event: string) =>
  eventLabels[event] ?? event.replaceAll("_", " ");

const emailSearchText = (email: ResendEmailSummary) =>
  [
    email.subject,
    email.lastEvent,
    eventLabel(email.lastEvent),
    dateTimeFormatter.format(new Date(email.createdAt)),
    email.recipients.join(" "),
  ]
    .join(" ")
    .toLowerCase();

export function RecentEmailTable({ emails }: { emails: ResendEmailSummary[] }) {
  const { query, setQuery, filtered, isPending } = useSearchFilter({
    data: emails,
    buildHaystack: emailSearchText,
    queryParam: "emailSearch",
  });
  const { page, pageSize, setPage, setPageSize, syncPage } = usePagination();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleEmails = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    if (page !== currentPage) syncPage(currentPage);
  }, [currentPage, page, syncPage]);

  return (
    <section aria-label="Recent email activity" className="space-y-3">
      <div className="relative">
        <Input
          label="Search recent email activity"
          name="email-activity-search"
          hideLabel
          leadingIcon={<FiSearch aria-hidden />}
          aria-busy={isPending}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search subjects, recipients, dates, or delivery states..."
          inputClassName="pr-10"
        />
        {isPending && (
          <span
            role="status"
            aria-label="Loading email activity results"
            className="absolute bottom-3 right-3 text-black/45 dark:text-white/45"
          >
            <FiLoader className="animate-spin motion-reduce:animate-none" />
          </span>
        )}
      </div>

      <div className="relative" aria-busy={isPending}>
        {isPending && (
          <div
            role="status"
            aria-label="Loading email activity results"
            className="absolute inset-0 z-10 grid min-h-40 place-items-center rounded-2xl bg-white/80 backdrop-blur-sm dark:bg-[#181818]/80"
          >
            <span className="flex items-center gap-3 rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-semibold shadow-lg dark:border-white/15 dark:bg-[#181818]">
              <FiLoader className="h-5 w-5 animate-spin motion-reduce:animate-none" />
              Loading email activity
            </span>
          </div>
        )}
        <Card
          variant="solid"
          size="none"
          className={`overflow-hidden transition-opacity ${isPending ? "pointer-events-none opacity-55" : ""}`}
        >
          <div className="border-b border-black/10 px-4 py-3 dark:border-white/10 md:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
              Recent email activity
            </p>
          </div>
          <div className="divide-y divide-black/10 dark:divide-white/10 md:hidden">
            {visibleEmails.map((email) => (
              <article key={email.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold">{email.subject}</p>
                  <Pill size="sm" variant="neutral" className="shrink-0">
                    {eventLabel(email.lastEvent)}
                  </Pill>
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-black/55 dark:text-white/55">
                  <time dateTime={email.createdAt}>
                    {dateTimeFormatter.format(new Date(email.createdAt))}
                  </time>
                  <span className="break-all text-right">
                    {email.recipients.join(", ") || "Recipient unavailable"}
                  </span>
                </div>
              </article>
            ))}
            {visibleEmails.length === 0 && (
              <EmptyState
                variant="plain"
                message={
                  emails.length === 0
                    ? "No recent email activity is available."
                    : "No email activity matches that search."
                }
              />
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] table-fixed text-left text-sm">
              <caption className="sr-only">Recent email activity</caption>
              <colgroup>
                <col className="w-[38%]" />
                <col className="w-[18%]" />
                <col className="w-[26%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead className="border-b border-black/10 bg-black/[0.025] text-[10px] uppercase tracking-[0.16em] text-black/50 dark:border-white/10 dark:bg-white/[0.025] dark:text-white/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Recipients</th>
                  <th className="px-4 py-3 font-semibold">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {visibleEmails.map((email) => (
                  <tr
                    key={email.id}
                    className="transition hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3 font-semibold">
                      <span className="block truncate">{email.subject}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Pill size="sm" variant="neutral">
                        {eventLabel(email.lastEvent)}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-black/65 dark:text-white/65">
                      <span className="block break-all">
                        {email.recipients.join(", ") || "Unavailable"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-black/55 dark:text-white/55">
                      <time dateTime={email.createdAt}>
                        {dateTimeFormatter.format(new Date(email.createdAt))}
                      </time>
                    </td>
                  </tr>
                ))}
                {visibleEmails.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        variant="plain"
                        message={
                          emails.length === 0
                            ? "No recent email activity is available."
                            : "No email activity matches that search."
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalCount={filtered.length}
            itemLabel="emails"
            disabled={isPending}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Card>
      </div>
    </section>
  );
}
