import { Spinner } from "@ryanmeetup/ui";

/**
 * Cover the viewport while a route streams. The fixed position matters when a
 * navigation starts from a scrolled page: a document-height fallback can leave
 * the footer visible until Next resets the scroll position.
 */
export default function Loading() {
  return (
    <main
      data-route-loading
      aria-busy="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#f1f2ef] px-4 py-12 text-black dark:bg-[#101010] dark:text-white"
    >
      <Spinner
        size={28}
        label="Loading page"
        className="text-black/45 dark:text-white/45"
      />
    </main>
  );
}
