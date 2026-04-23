"use client";

import { useMemo } from "react";

// Components
import NextImage from "next/image";
import { SponsorLink } from "@/components/sponsors/SponsorLink";
import Marquee from "react-fast-marquee";

// Types
import type { Sponsor } from "@/lib/types";

// Utilities
import { useTheme } from "next-themes";
import { convertImageUrl } from "@/utils/convert";

type SponsorCarousel = {
  sponsors: Sponsor[];
};

const SponsorCarousel = (props: SponsorCarousel) => {
  const { resolvedTheme } = useTheme();

  const { sponsors } = props;

  const sponsorLogos = useMemo(
    () =>
      sponsors.map((sponsor) => ({
        href: sponsor.href,
        name: sponsor.name,
        active: sponsor.active,
        partnershipType: sponsor.partnershipType,
        src:
          (resolvedTheme ?? "dark") === "light"
            ? (convertImageUrl(sponsor.lightModeImage) as string)
            : (convertImageUrl(sponsor.darkModeImage) as string),
      })),
    [sponsors, resolvedTheme],
  );

  const [topRow, bottomRow] = useMemo(() => {
    const recurring = sponsorLogos.filter(
      (sponsor) =>
        sponsor.partnershipType === "Recurring Sponsor" && sponsor.active,
    );
    const featured = sponsorLogos.filter(
      (sponsor) => sponsor.partnershipType === "Featured Brand Partner",
    );
    const community = sponsorLogos.filter(
      (sponsor) => sponsor.partnershipType === "Community Supporter",
    );
    const unassigned = sponsorLogos.filter(
      (sponsor) => !sponsor.partnershipType,
    );

    const primaryRow = [...recurring, ...featured];
    const secondaryRow = [...community, ...unassigned];

    return [
      primaryRow.length > 0 ? primaryRow : sponsorLogos,
      secondaryRow.length > 0 ? secondaryRow : sponsorLogos,
    ];
  }, [sponsorLogos]);

  return (
    <div className="-mt-4 -mb-8">
      <Marquee speed={50} gradient={false}>
        {topRow.map((sponsor, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center py-4">
            <SponsorLink
              href={sponsor.href}
              sponsorName={sponsor.name}
              placement="homepage_carousel_top"
              partnershipType={sponsor.partnershipType}
              className="group mx-4 flex h-[120px] w-[11.5rem] items-center justify-center rounded-2xl border border-white/10 bg-white transition hover:-translate-y-1 hover:border-white/30 dark:bg-white/5 dark:hover:bg-white/10 sm:mx-6 sm:h-[176px] sm:w-[18rem]"
            >
              <NextImage
                src={sponsor.src}
                alt={sponsor.name}
                width={360}
                height={180}
                className="h-[88px] w-auto object-contain sm:h-[128px]"
                sizes="(max-width: 640px) 200px, (max-width: 768px) 280px, 360px"
              />
            </SponsorLink>
          </div>
        ))}
      </Marquee>
      <Marquee speed={40} gradient={false} direction="right">
        {bottomRow.map((sponsor, idx) => (
          <div
            key={`${sponsor.name}-${idx}`}
            className="flex flex-col items-center justify-center py-4"
          >
            <SponsorLink
              href={sponsor.href}
              sponsorName={sponsor.name}
              placement="homepage_carousel_bottom"
              partnershipType={sponsor.partnershipType}
              className="group mx-3 flex h-[92px] w-[8.5rem] items-center justify-center rounded-2xl border border-white/10 bg-white transition hover:-translate-y-1 hover:border-white/30 dark:bg-white/5 dark:hover:bg-white/10 sm:mx-4 sm:h-[132px] sm:w-[12.5rem]"
            >
              <NextImage
                src={sponsor.src}
                alt={sponsor.name}
                width={240}
                height={120}
                className="h-[56px] w-auto object-contain sm:h-[88px]"
                sizes="(max-width: 640px) 140px, (max-width: 768px) 200px, 240px"
              />
            </SponsorLink>
          </div>
        ))}
      </Marquee>
    </div>
  );
};

export { SponsorCarousel };
