// Components
import NextLink from "next/link";
import { Sponsor } from "@/components/sponsors";
import { Card, EmptyState, Heading, Kicker, Text } from "@ryanmeetup/ui";

// Types
import type { Sponsor as SponsorType } from "@/lib/types";
import { getMonthlyBackerTierRank } from "@/lib/sponsorship-program";
import { contactHrefs } from "@/utils/contact";

type SponsorSectionProps = {
  id: string;
  title: string;
  description: string;
  sponsors: SponsorType[];
  kicker?: string | false;
  emptyMessage?: string;
  sponsorSize?: "default" | "featured" | "compact";
};

const SponsorSection = (props: SponsorSectionProps) => {
  const {
    sponsors,
    id,
    title,
    description,
    kicker,
    emptyMessage,
    sponsorSize = "default",
  } = props;
  const isDefaultSponsorGrid = sponsorSize === "default";
  const isRecurringSponsorSection =
    sponsors.length > 0 &&
    sponsors.every(
      (sponsor) => sponsor.partnershipType === "Recurring Sponsor",
    );
  const sorted = [...sponsors].sort((a, b) => {
    if (isRecurringSponsorSection) {
      const tierDifference =
        getMonthlyBackerTierRank(b.backerTier) -
        getMonthlyBackerTierRank(a.backerTier);
      if (tierDifference !== 0) return tierDifference;
    }

    return a.name.localeCompare(b.name);
  });
  const shouldFeatureRecurringSponsors =
    isDefaultSponsorGrid && isRecurringSponsorSection;
  const defaultGridClass = shouldFeatureRecurringSponsors
    ? "grid-cols-1 md:grid-cols-3"
    : "sm:grid-cols-2 lg:grid-cols-3";
  const monthlyBackerOpenings = shouldFeatureRecurringSponsors
    ? Math.max(0, 3 - sorted.length)
    : 0;

  return (
    <section className="space-y-6" id={id}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <Heading className="text-3xl title sm:text-4xl lg:text-5xl" size="h2">
          {title}
        </Heading>
        {kicker !== false && (
          <Kicker>{kicker ?? `${sorted.length} partners`}</Kicker>
        )}
      </div>

      <Text className="text-base text-black/70 dark:text-white/70">
        {description}
      </Text>

      {sorted.length > 0 ? (
        <div
          className={`grid gap-4 ${
            isDefaultSponsorGrid
              ? defaultGridClass
              : sponsorSize === "featured"
                ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
          }`}
        >
          {sorted.map((sponsor) => (
            <Sponsor
              key={sponsor.name as string}
              sponsor={sponsor as SponsorType}
              className="w-full"
              imageWrapperClassName={
                shouldFeatureRecurringSponsors
                  ? sponsor.backerDescription
                    ? "h-36 overflow-hidden sm:h-40"
                    : "h-48 overflow-hidden sm:h-56"
                  : undefined
              }
              imageClassName={
                shouldFeatureRecurringSponsors ? "object-center" : undefined
              }
              size={sponsorSize}
              placement={id}
            />
          ))}
          {Array.from({ length: monthlyBackerOpenings }, (_, index) => (
            <NextLink
              key={`monthly-backer-opening-${index + 1}`}
              href={contactHrefs.monthlyBacker}
              className="group flex w-full"
              aria-label="Become a Monthly Backer"
            >
              <Card
                variant="outline"
                size="lg"
                hover
                className="flex min-h-[240px] w-full items-center justify-center border-dashed text-center md:min-h-[280px]"
              >
                <div className="space-y-3">
                  <Kicker>Monthly Backer opening</Kicker>
                  <Heading className="text-3xl title" size="h3">
                    Your brand here
                  </Heading>
                  <Text className="text-sm text-black/70 dark:text-white/70">
                    Pick a tier and join the grid.
                  </Text>
                </div>
              </Card>
            </NextLink>
          ))}
        </div>
      ) : (
        <EmptyState
          message={emptyMessage ?? "Nothing to show here yet."}
          className="text-left"
        />
      )}
    </section>
  );
};

export { SponsorSection };
