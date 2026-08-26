import { Banner } from "@ryanmeetup/ui";
import { FiPlayCircle } from "react-icons/fi";

/**
 * Demo builds run on fixtures instead of a database, so the notice has to stay
 * on screen: anyone landing mid-session needs to know the workspace they are
 * poking at is disposable. It is deliberately not dismissible.
 */
export function DemoBanner() {
  return (
    <Banner
      variant="brand"
      icon={<FiPlayCircle className="h-6 w-6" aria-hidden />}
      aria-label="Demo mode notice"
      mobileInline
    >
      <p>
        You&rsquo;re in demo mode. Everything here is sample data, changes are
        kept in this browser session only, and nothing is saved or sent
        anywhere.
      </p>
    </Banner>
  );
}
