"use client";

import { useMemo } from "react";

// Components
import NextImage from "next/image";
import { Button } from "@/components/global";
import { SponsorLink } from "@/components/sponsors/SponsorLink";
import Marquee from "react-fast-marquee";

// Types
import type { Sponsor } from "@/lib/types";

// Utilities
import { useTheme } from "next-themes";
import { layoutPaddingX } from "@/lib/constants";
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

  const { topRow, bottomRow, featuredRecurringSponsor } = useMemo(() => {
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

    const primaryRow = featured;
    const secondaryRow = [...community, ...unassigned];
    const nonRecurringSponsors = [...featured, ...community, ...unassigned];

    return {
      topRow: primaryRow.length > 0 ? primaryRow : nonRecurringSponsors,
      bottomRow: secondaryRow.length > 0 ? secondaryRow : nonRecurringSponsors,
      featuredRecurringSponsor: recurring.length === 1 ? recurring[0] : null,
    };
  }, [sponsorLogos]);

  return (
    <div className="-mb-8 flex flex-col gap-4">
      {featuredRecurringSponsor ? (
        <div className={layoutPaddingX}>
          <div className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.24),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.88))] p-1 shadow-xl shadow-black/10 dark:border-white/15 dark:bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] dark:shadow-black/30">
            <div className="grid gap-6 rounded-[1.75rem] border border-white/70 bg-white/75 p-6 backdrop-blur dark:border-white/10 dark:bg-black/20 sm:p-8 lg:grid-cols-[0.9fr_1.35fr] lg:items-center">
              <div className="space-y-3 text-center lg:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/55 dark:text-white/55">
                  Current recurring sponsor
                </p>
                <h3 className="text-3xl font-black tracking-tight text-black dark:text-white sm:text-4xl">
                  Powered by {featuredRecurringSponsor.name}
                </h3>
                <p className="mx-auto max-w-xl text-sm leading-6 text-black/65 dark:text-white/65 lg:mx-0">
                  Ongoing sponsors help keep Ryan Meetup weird, welcoming, and
                  actually possible across the places Ryans gather.
                </p>
                <Button.Link
                  href="/sponsors/partnerships"
                  variant="primary"
                  size="sm"
                  newTab={false}
                  className="relative z-10 w-full sm:w-auto"
                >
                  Become a recurring sponsor
                </Button.Link>
              </div>
              <SponsorLink
                href={featuredRecurringSponsor.href}
                sponsorName={featuredRecurringSponsor.name}
                placement="homepage_recurring_spotlight"
                partnershipType={featuredRecurringSponsor.partnershipType}
                className="flex min-h-[220px] items-center justify-center rounded-3xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-black/20 group-hover:scale-[1.02] dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30 sm:min-h-[280px] sm:p-8"
              >
                <NextImage
                  src={featuredRecurringSponsor.src}
                  alt={featuredRecurringSponsor.name}
                  width={1100}
                  height={550}
                  className="h-[190px] w-auto scale-125 object-contain sm:h-[250px] sm:scale-150"
                  sizes="(max-width: 640px) 440px, (max-width: 1024px) 720px, 1100px"
                />
              </SponsorLink>
            </div>
          </div>
        </div>
      ) : null}

      <Marquee speed={50} gradient={false}>
        {topRow.map((sponsor, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center py-4"
          >
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
