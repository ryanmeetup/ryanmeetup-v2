"use client";

import { Banner, Button } from "@ryanmeetup/ui";
import { FiPlayCircle, FiX } from "react-icons/fi";
import { useDemoPreview } from "@/hooks/useDemoPreview";
import { isDemoBuild } from "@/lib/instance";

/**
 * Demo mode runs on fixtures instead of a database, so the notice has to stay
 * on screen: anyone landing mid-session needs to know the workspace they are
 * poking at is disposable. It is deliberately not dismissible.
 *
 * A demo build has nothing to return to, so it gets the notice alone. An owner
 * previewing the demo from a configured deployment gets the way out, and this
 * is the only one — demo mode hides the admin section that turned it on.
 * `isDemoBuild` is compiled into the client bundle, so telling the two apart
 * needs no prop threaded down from the server.
 */
export function DemoBanner() {
  const { pending, setDemoPreview } = useDemoPreview();

  return (
    <Banner
      variant="brand"
      icon={<FiPlayCircle className="h-6 w-6" aria-hidden />}
      aria-label="Demo mode notice"
      mobileInline
      action={
        isDemoBuild ? undefined : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<FiX />}
            className="whitespace-nowrap"
            loading={pending}
            loadingText="Leaving"
            onClick={() => setDemoPreview(false, "/admin")}
          >
            Exit demo
          </Button>
        )
      }
    >
      <p>
        You&rsquo;re in demo mode. Everything here is sample data, changes are
        kept in this browser session only, and nothing is saved or sent
        anywhere.
      </p>
    </Banner>
  );
}
