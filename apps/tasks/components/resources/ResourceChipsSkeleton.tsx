/**
 * Placeholder pills for a chip row whose contents are still being fetched.
 * Sized to the real pill in ResourceLinks/ResourceAttachmentsPreview - 12px
 * text on a 16px line, 6px of vertical padding, and a hairline border - so the
 * row does not shift height when the fetched chips replace it.
 */
export function ResourceChipsSkeleton({
  count,
  label,
  className = "",
}: {
  /**
   * How many pills to reserve. Undefined means the caller does not know yet,
   * which reserves two - enough to read as a pending row without dominating
   * the header if the resource turns out to hold only one.
   */
  count?: number;
  label: string;
  className?: string;
}) {
  // Capped so a resource with many attachments does not fill the header with
  // placeholder pills that the real, wrapping row would not have needed.
  const pills = Math.min(Math.max(count ?? 2, 1), 4);
  // Varied so the row reads as several pending items rather than one repeated
  // shape, but fixed per position so it does not reshuffle between renders.
  const widths = ["w-28", "w-36", "w-24"];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      aria-busy="true"
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {Array.from({ length: pills }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={`h-[30px] animate-pulse rounded-full border border-black/10 bg-black/[0.05] motion-reduce:animate-none dark:border-white/10 dark:bg-white/[0.07] ${widths[index % widths.length]}`}
        />
      ))}
    </div>
  );
}
