import { Banner as SharedBanner, Button } from "@ryanmeetup/ui";
import { FiCalendar } from "react-icons/fi";

export type BannerProps = {
  message: string;
  href: string;
  actionLabel: string;
};

/**
 * Site-wide event announcement. Render this above the header in Layout when an
 * upcoming event should be promoted.
 */
export function Banner({ message, href, actionLabel }: BannerProps) {
  return (
    <SharedBanner
      variant="brand"
      icon={<FiCalendar aria-hidden />}
      aria-label="Upcoming event announcement"
      className="font-cooper"
      action={
        <Button.Link
          href={href}
          size="sm"
          variant="secondary"
          className="whitespace-nowrap"
        >
          {actionLabel}
        </Button.Link>
      }
    >
      <p>{message}</p>
    </SharedBanner>
  );
}
