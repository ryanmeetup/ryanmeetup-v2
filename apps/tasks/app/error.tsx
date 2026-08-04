"use client";

import { Button, ErrorCallout, Heading } from "@ryanmeetup/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-12 text-black dark:text-white">
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
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
