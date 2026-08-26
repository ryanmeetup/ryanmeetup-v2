"use client";

import { useState } from "react";
import { toast } from "@ryanmeetup/ui";
import { ApiMutationError, mutate } from "@/lib/mutation-client";
import { DEMO_PREVIEW_ENDPOINT } from "@/lib/demo-preview";

/**
 * Enter or leave demo preview.
 *
 * Demo mode is resolved on the server for the entire page tree — the layout,
 * the branding, and every route's data source — so switching it hands off to a
 * full document load rather than a client transition. `pending` is deliberately
 * left set on success: the button stays busy until that navigation replaces
 * the page.
 */
export function useDemoPreview() {
  const [pending, setPending] = useState(false);

  async function setDemoPreview(enabled: boolean, destination = "/") {
    setPending(true);
    try {
      await mutate(DEMO_PREVIEW_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
      window.location.assign(destination);
    } catch (error) {
      setPending(false);
      toast.error(
        error instanceof ApiMutationError
          ? error.message
          : "Demo preview could not be changed. Try again.",
      );
    }
  }

  return { pending, setDemoPreview };
}
