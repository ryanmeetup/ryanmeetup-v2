import { Banner } from "@ryanmeetup/ui";
import { FiInfo } from "react-icons/fi";

export function BetaBanner() {
  return (
    <Banner variant="info" icon={<FiInfo aria-hidden />} aria-label="Beta notice">
      <p>
        Ryan Meetup Tasks is currently in beta and undergoing active
        development. If you encounter an issue or have a feature request or
        suggestion, please contact Ryan Le directly.
      </p>
    </Banner>
  );
}
