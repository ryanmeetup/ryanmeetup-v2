"use client";

import { Button } from "./Button";
import { ErrorCallout } from "./ErrorCallout";
import { Heading } from "./Heading";

export type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function AppError({ error, reset }: AppErrorProps) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-12 text-black dark:text-white">
      <div className="w-full max-w-xl space-y-5">
        <Heading size="h1">Something went wrong</Heading>
        <ErrorCallout>
          {error.message || "An unexpected error occurred."}
        </ErrorCallout>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
