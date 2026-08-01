"use client";

import { SponsorLogoMarquee } from "@ryanmeetup/sponsors";
import { convertImageUrl } from "@ryanmeetup/utils";
import { useMemo } from "react";
import type { Sponsor } from "@/lib/types";

const SponsorCarousel = ({ sponsors }: { sponsors: Sponsor[] }) => {
  const logos = useMemo(
    () =>
      sponsors.flatMap((sponsor) => {
        const src = convertImageUrl(sponsor.image);
        return src ? [{ href: sponsor.href, name: sponsor.name, src }] : [];
      }),
    [sponsors],
  );
  const topRow = logos.filter((_, index) => index % 2 === 0);
  const bottomRow = logos.filter((_, index) => index % 2 === 1);
  return (
    <div className="-mb-8 -mt-4">
      <SponsorLogoMarquee
        sponsors={topRow}
        itemClassName="mx-4 h-[120px] w-[10.5rem] sm:mx-6 sm:h-[168px] sm:w-[16.5rem]"
        imageClassName="h-[84px] sm:h-[120px]"
      />
      <SponsorLogoMarquee
        sponsors={bottomRow}
        speed={40}
        direction="right"
        itemClassName="mx-4 h-[108px] w-[9.75rem] sm:mx-6 sm:h-[156px] sm:w-[15rem]"
        imageClassName="h-[72px] sm:h-[108px]"
      />
    </div>
  );
};

export { SponsorCarousel };
