import { SponsorSection as SharedSponsorSection } from "@ryanmeetup/sponsors";
import { convertImageUrl } from "@ryanmeetup/utils";
import type { Sponsor } from "@/lib/types";

type SponsorSectionProps = {
  id: string;
  title: string;
  description: string;
  sponsors: Sponsor[];
  emptyMessage?: string;
  sponsorSize?: "default" | "featured" | "compact";
};

const SponsorSection = ({
  id,
  title,
  description,
  sponsors,
  emptyMessage,
  sponsorSize = "default",
}: SponsorSectionProps) => {
  const normalized = [...sponsors]
    .sort((a, b) => b.eventsSponsored - a.eventsSponsored)
    .flatMap((sponsor) => {
      const src = convertImageUrl(sponsor.image);
      return src ? [{ name: sponsor.name, href: sponsor.href, src }] : [];
    });

  const gridClassName =
    sponsorSize === "default"
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : sponsorSize === "featured"
        ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "grid-cols-2 md:grid-cols-3 xl:grid-cols-5";
  const cardClassName = sponsorSize === "compact" ? "h-40 p-4" : "h-56 p-6";
  const imageClassName = sponsorSize === "compact" ? "h-28" : "h-40";

  return (
    <SharedSponsorSection
      id={id}
      title={title}
      description={description}
      sponsors={normalized}
      emptyMessage={emptyMessage}
      gridClassName={gridClassName}
      cardClassName={cardClassName}
      imageClassName={imageClassName}
    />
  );
};

export { SponsorSection };
