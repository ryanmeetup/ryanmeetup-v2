"use client";

/**
 * A miniature of the digest email header from `lib/server/task-digest-email.ts`,
 * which is the only surface the accent colour reaches. The app itself is themed
 * from `packages/brand` tokens, so without this the setting looks like it ought
 * to recolour the interface and then appears to do nothing.
 *
 * Colours are hard-coded to the email's own palette rather than theme tokens,
 * because the email renders the same way regardless of the reader's theme.
 */
export function AccentEmailPreview({
  accentColor,
  productName,
}: {
  accentColor: string;
  productName: string;
}) {
  return (
    <figure className="m-0">
      <div
        aria-hidden
        className="overflow-hidden rounded-lg border border-black/10 bg-[#e7e9e8] p-3 dark:border-white/15"
      >
        <div className="overflow-hidden rounded-md border border-[#cfd3d1] bg-white">
          <div style={{ borderTop: `4px solid ${accentColor}` }} />
          <div className="border-b border-[#d9dcda] px-3 py-2.5">
            <p className="truncate font-cooper text-[11px] uppercase leading-none text-[#111827]">
              {productName}
            </p>
            <p className="mt-2 font-cooper text-[13px] leading-none text-[#111827]">
              Your workload rundown
            </p>
            <div className="mt-2 space-y-1">
              <div className="h-1 w-4/5 rounded-full bg-[#d9dcda]" />
              <div className="h-1 w-3/5 rounded-full bg-[#d9dcda]" />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-black/55 dark:text-white/55">
        The digest email header — the one place this colour appears.
      </figcaption>
    </figure>
  );
}
