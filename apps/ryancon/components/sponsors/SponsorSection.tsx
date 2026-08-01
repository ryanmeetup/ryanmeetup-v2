import { SponsorSection as SharedSponsorSection } from "@ryanmeetup/sponsors";
import { convertImageUrl } from "@ryanmeetup/utils";
import type { Sponsor } from "@/lib/types";

const descriptions: Record<string, string> = {
  Founding:
    "Founding sponsors have gone above and beyond to support the Ryan Meetup with essential resources, funding, and visibility.",
  Core: "Core sponsors show consistent support across multiple Ryan Meetups, helping us keep the momentum growing.",
  Contributing:
    "Contributing sponsors help individual Ryan Meetups come to life with timely support and resources.",
};

const SponsorSection = ({
  sponsors,
  tier,
}: {
  sponsors: Sponsor[];
  tier: string;
}) => {
  const normalized = [...sponsors]
    .sort((a, b) => b.eventsSponsored - a.eventsSponsored)
    .flatMap((sponsor) => {
      const src = convertImageUrl(sponsor.image);
      return src ? [{ name: sponsor.name, href: sponsor.href, src }] : [];
    });
  return (
    <SharedSponsorSection
      title={`${tier} Sponsors`}
      description={descriptions[tier]}
      sponsors={normalized}
    />
  );
};

export { SponsorSection };
