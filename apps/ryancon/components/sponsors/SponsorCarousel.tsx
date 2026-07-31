"use client";

import { useMemo } from "react";

// Components
import NextImage from "next/image";
import NextLink from "next/link";
import { Button } from "@/components/global";
import Marquee from "react-fast-marquee";

// Types
import type { Sponsor } from "@/lib/types";

// Utilities
import { convertImageUrl } from "@/utils/convert";

type SponsorCarousel = {
  sponsors: Sponsor[];
};

const SponsorCarousel = (props: SponsorCarousel) => {
  const { sponsors } = props;

  const sponsorLogos = useMemo(
    () =>
      sponsors.map((sponsor) => ({
        href: sponsor.href,
        name: sponsor.name,
        src: convertImageUrl(sponsor.image) as string,
      })),
    [sponsors],
  );
  const [topRow, bottomRow] = useMemo(() => {
    const top: typeof sponsorLogos = [];
    const bottom: typeof sponsorLogos = [];

    sponsorLogos.forEach((sponsor, index) => {
      if (index % 2 === 0) {
        top.push(sponsor);
      } else {
        bottom.push(sponsor);
      }
    });

    return [top, bottom];
  }, [sponsorLogos]);

  return (
    <div className="-mt-4 -mb-8">
      <Marquee speed={50} gradient={false}>
        {topRow.map((sponsor, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center py-4">
            <NextLink
              href={sponsor.href}
              className="group mx-4 flex h-[120px] w-[10.5rem] items-center justify-center rounded-2xl border border-white/10 bg-white transition hover:-translate-y-1 hover:border-white/30 dark:bg-white/5 dark:hover:bg-white/10 sm:mx-6 sm:h-[168px] sm:w-[16.5rem]"
            >
              <NextImage
                src={sponsor.src}
                alt={sponsor.name}
                width={320}
                height={160}
                className="h-[84px] w-auto object-contain sm:h-[120px]"
                sizes="(max-width: 640px) 180px, (max-width: 768px) 260px, 320px"
              />
            </NextLink>
          </div>
        ))}
      </Marquee>
      <Marquee speed={40} gradient={false} direction="right">
        {bottomRow.map((sponsor, idx) => (
          <div
            key={`${sponsor.name}-${idx}`}
            className="flex flex-col items-center justify-center py-4"
          >
            <NextLink
              href={sponsor.href}
              className="group mx-4 flex h-[108px] w-[9.75rem] items-center justify-center rounded-2xl border border-white/10 bg-white transition hover:-translate-y-1 hover:border-white/30 dark:bg-white/5 dark:hover:bg-white/10 sm:mx-6 sm:h-[156px] sm:w-[15rem]"
            >
              <NextImage
                src={sponsor.src}
                alt={sponsor.name}
                width={300}
                height={150}
                className="h-[72px] w-auto object-contain sm:h-[108px]"
                sizes="(max-width: 640px) 160px, (max-width: 768px) 240px, 300px"
              />
            </NextLink>
          </div>
        ))}
      </Marquee>
    </div>
  );
};

export { SponsorCarousel };
