import type { AccessPreview } from "@/lib/types";
import { AccessPreviewBanner } from "./AccessPreviewBanner";
import { BetaBanner } from "./BetaBanner";

export function TaskBanners({ preview }: { preview?: AccessPreview }) {
  return (
    <div className="sticky top-16 z-10">
      <BetaBanner />
      <AccessPreviewBanner preview={preview} />
    </div>
  );
}
