import { Banner } from "@ryanmeetup/ui";
import { FiInfo } from "react-icons/fi";

export function BetaBanner() {
  return (
    <Banner
      variant="info"
      icon={<FiInfo className="h-6 w-6" aria-hidden />}
      aria-label="Beta notice"
    >
      <p>
        Tasks is in beta. Found an issue or have an idea? Contact Ryan or file
        a task in <code>tasks.ryanmeetup.com</code>.
      </p>
    </Banner>
  );
}
