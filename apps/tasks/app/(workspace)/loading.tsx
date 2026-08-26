import { Spinner } from "@ryanmeetup/ui";

/** Keep the workspace chrome interactive while only the next page streams. */
export default function Loading() {
  return (
    <div
      data-workspace-content-loading
      aria-busy="true"
      className="grid min-h-[calc(100dvh-4rem)] place-items-center px-4 py-12 text-black dark:text-white"
    >
      <Spinner
        size={28}
        label="Loading page content"
        className="text-black/45 dark:text-white/45"
      />
    </div>
  );
}
