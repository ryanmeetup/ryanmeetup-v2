import type { AccessPreview } from "@/lib/workspace/workspace-types";
import { AccessPreviewBanner } from "./AccessPreviewBanner";
import { BetaBanner } from "./BetaBanner";
import { DemoBanner } from "./DemoBanner";

export function TaskBanners({
  demoMode,
  preview,
}: {
  demoMode: boolean;
  preview?: AccessPreview;
}) {
  return (
    <div className="sticky top-[6.5rem] z-10 sm:top-16">
      {demoMode ? <DemoBanner /> : <BetaBanner />}
      <AccessPreviewBanner preview={preview} />
    </div>
  );
}
