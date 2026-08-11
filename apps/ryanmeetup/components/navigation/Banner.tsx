import { Banner as SharedBanner, Button } from "@ryanmeetup/ui";
import { FiCalendar } from "react-icons/fi";

export type BannerProps = {
  message: string;
  href: string;
  actionLabel: string;
  className?: string;
};

/**
 * Site-wide event announcement. Render this above the header in Layout when an
 * upcoming event should be promoted.
 */

// TODO: standardize this banner component even further to include:
//  - optional classname on the global banner
//  - no inline styles (use tailwind)
//  - color props for the banner and button
export function Banner({ 
  message, 
  href, 
  actionLabel, 
  className = '',
}: BannerProps) {
  return (
    <SharedBanner
      variant="neutral"
      // icon={<FiCalendar aria-hidden />}
      aria-label="Ryan Meetup California - Ready Player Ryan and Sun Soaked"
      className={`${className} border-[#f6c500]/40 bg-[#ef3d23] font-cooper !text-xl text-[#f4f0df]`}
      style={{
        backgroundColor: "#ef3d23",
        borderColor: "rgba(246, 197, 0, 0.4)",
        color: "#f4f0df",
      }}
      action={
        <Button.Link
          href={href}
          size="sm"
          variant="secondary"
          className="whitespace-nowrap border-[#f6c500] bg-[#f6c500] text-[#4b210f] hover:border-[#ffe168] hover:bg-[#ffe168]"
          style={{
            backgroundColor: "#f6c500",
            borderColor: "#f6c500",
            color: "#4b210f",
          }}
        >
          {actionLabel}
        </Button.Link>
      }
    >
      <p>{message}</p>
    </SharedBanner>
  );
}
