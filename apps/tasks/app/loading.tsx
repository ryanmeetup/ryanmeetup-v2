import { Spinner } from "@ryanmeetup/ui";

/**
 * Without this boundary a slow server render streams the layout alone, so the
 * footer lands at the top of the empty content area until the page arrives.
 */
export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12 text-black dark:text-white">
      <Spinner
        size={28}
        label="Loading"
        className="text-black/45 dark:text-white/45"
      />
    </main>
  );
}
