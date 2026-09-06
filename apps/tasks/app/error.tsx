"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { Button, ErrorCallout, Heading, Spinner } from "@ryanmeetup/ui";
import { RECOVERY_DELAY_MS, reloadPolicy } from "@/lib/page-recovery";

/**
 * Shared by every mount of this boundary, so a failure that keeps coming back
 * spends the same budget instead of getting a fresh one each time it lands.
 */
const mayReload = reloadPolicy();

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  // Decided as the page renders, so a failure worth reloading is never
  // announced as one. The error is a new object per failure, so a reload that
  // fails again asks the budget a second time and is refused.
  const recovering = mayReload(error);

  useEffect(() => {
    if (!recovering) return;
    const timer = setTimeout(() => {
      // `reset` alone re-renders what the server already sent; the refresh is
      // what asks for the page again.
      startTransition(() => {
        router.refresh();
        reset();
      });
    }, RECOVERY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [recovering, reset, router]);

  return (
    <main
      data-workspace-error
      className="grid min-h-screen place-items-center px-4 py-12 text-black dark:text-white"
    >
      {recovering ? (
        <div
          data-workspace-error-recovering
          aria-busy="true"
          className="flex items-center gap-3 text-sm text-black/70 dark:text-white/70"
        >
          <Spinner
            size={20}
            label="Loading your workspace"
            className="text-black/45 dark:text-white/45"
          />
          Loading your workspace…
        </div>
      ) : (
        <div className="w-full max-w-xl space-y-5">
          <Heading size="h1">We couldn’t load your workspace</Heading>
          <ErrorCallout>
            Your records have not been replaced with an empty workspace. Try
            loading them again, and share the reference below if the problem
            continues.
          </ErrorCallout>
          {error.digest ? (
            <p className="text-sm text-black/70 dark:text-white/70">
              Reference: <code>{error.digest}</code>
            </p>
          ) : null}
          <Button
            type="button"
            size="md"
            onClick={() => {
              startTransition(() => {
                router.refresh();
                reset();
              });
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </main>
  );
}
