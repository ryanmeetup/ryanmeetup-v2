"use client";

import { useMemo } from "react";

// Components
import NextImage from "next/image";
import { Button } from "@ryanmeetup/ui";
import { SponsorLogoMarquee } from "@ryanmeetup/sponsors";
import { SponsorLink } from "@/components/sponsors/SponsorLink";
import { buildSponsorTrackingHref } from "@/components/sponsors/SponsorLink";

// Types
import type { Sponsor } from "@/lib/types";

// Utilities
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { layoutPaddingX } from "@/lib/constants";
import { convertImageUrl } from "@ryanmeetup/utils";

type SponsorCarousel = {
  sponsors: Sponsor[];
};

const SponsorCarousel = (props: SponsorCarousel) => {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

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

      <SponsorLogoMarquee
        sponsors={topRow.map((sponsor) => ({
          name: sponsor.name,
          src: sponsor.src,
          href: buildSponsorTrackingHref({
            href: sponsor.href,
            sponsorName: sponsor.name,
            placement: "homepage_carousel_top",
            partnershipType: sponsor.partnershipType,
            source: pathname,
          }),
        }))}
        itemClassName="mx-4 h-[120px] w-[11.5rem] sm:mx-6 sm:h-[176px] sm:w-[18rem]"
        imageClassName="h-[88px] sm:h-[128px]"
      />
      <SponsorLogoMarquee
        sponsors={bottomRow.map((sponsor) => ({
          name: sponsor.name,
          src: sponsor.src,
          href: buildSponsorTrackingHref({
            href: sponsor.href,
            sponsorName: sponsor.name,
            placement: "homepage_carousel_bottom",
            partnershipType: sponsor.partnershipType,
            source: pathname,
          }),
        }))}
        speed={40}
        direction="right"
        itemClassName="mx-3 h-[92px] w-[8.5rem] sm:mx-4 sm:h-[132px] sm:w-[12.5rem]"
        imageClassName="h-[56px] sm:h-[88px]"
      />
    </div>
  );
};

export { SponsorCarousel };
