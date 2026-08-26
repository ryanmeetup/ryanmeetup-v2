import type { AccessPreview } from "@/lib/workspace/workspace-types";
import { AccessPreviewBanner } from "./AccessPreviewBanner";
import { BetaBanner } from "./BetaBanner";

export function TaskBanners({
  demoMode,
  preview,
}: {
  demoMode: boolean;
  preview?: AccessPreview;
}) {
  return (
    <div className="sticky top-[6.5rem] z-10 sm:top-16">
      {!demoMode && <BetaBanner />}
      <AccessPreviewBanner preview={preview} />
    </div>
  );
}
