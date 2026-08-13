import type { AccessPreview } from "@/lib/workspace-types";
import { AccessPreviewBanner } from "./AccessPreviewBanner";
import { BetaBanner } from "./BetaBanner";

export function TaskBanners({ preview }: { preview?: AccessPreview }) {
  return (
    <div className="sticky top-[6.5rem] z-10 sm:top-16">
      <BetaBanner />
      <AccessPreviewBanner preview={preview} />
    </div>
  );
}
