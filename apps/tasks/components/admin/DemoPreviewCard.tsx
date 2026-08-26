"use client";

import { Button, Card, Kicker, Text } from "@ryanmeetup/ui";
import { FiPlayCircle } from "react-icons/fi";
import { useDemoPreview } from "@/hooks/useDemoPreview";
import { DEMO_PREVIEW_MAX_AGE_SECONDS } from "@/lib/demo-preview";

const previewHours = DEMO_PREVIEW_MAX_AGE_SECONDS / 3600;

/**
 * The way into demo preview. It lives on the admin overview beside integration
 * health because it is the same kind of thing — an owner-only look at how the
 * workspace is behaving — rather than a setting that changes it.
 */
export function DemoPreviewCard() {
  const { pending, setDemoPreview } = useDemoPreview();

  return (
    <section className="space-y-4">
      <Kicker>Demo preview</Kicker>
      <Card
        variant="solid"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-2">
          <Text className="text-sm">
            See this workspace exactly as a demo build renders it: sample
            fixtures, neutral branding, and the demo banner. It changes only
            your own browser, and nothing you touch while previewing reaches the
            database.
          </Text>
          <Text className="text-sm">
            Demo mode hides admin, so leave the preview from the banner at the
            top of the page. It also lapses on its own after {previewHours}{" "}
            hours.
          </Text>
        </div>
        <Button
          type="button"
          variant="secondary"
          leftIcon={<FiPlayCircle />}
          className="w-full shrink-0 sm:w-auto"
          loading={pending}
          loadingText="Starting"
          onClick={() => setDemoPreview(true, "/")}
        >
          Enter demo preview
        </Button>
      </Card>
    </section>
  );
}
