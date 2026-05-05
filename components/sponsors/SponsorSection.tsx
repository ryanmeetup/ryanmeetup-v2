// Components
import { Sponsor } from "@/components/sponsors";
import { EmptyState, Heading, Text, Kicker } from "@/components/global";

// Types
import type { Sponsor as SponsorType } from "@/lib/types";

type SponsorSectionProps = {
  id: string;
  title: string;
  description: string;
  sponsors: SponsorType[];
  kicker?: string;
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
  const sorted = [...sponsors].sort((a, b) => a.name.localeCompare(b.name));
  const isDefaultSponsorGrid = sponsorSize === "default";
  const isRecurringSponsorSection =
    id === "recurring-sponsors" ||
    sorted.every((sponsor) => sponsor.partnershipType === "Recurring Sponsor");
  const shouldFeatureRecurringSponsors =
    isDefaultSponsorGrid && isRecurringSponsorSection;
  const defaultGridClass =
    shouldFeatureRecurringSponsors && sorted.length <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="space-y-6" id={id}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <Heading className="text-3xl title sm:text-4xl lg:text-5xl" size="h2">
          {title}
        </Heading>
        <Kicker>{kicker ?? `${sorted.length} partners`}</Kicker>
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
                  ? "h-64 overflow-visible sm:h-80"
                  : undefined
              }
              imageClassName={
                shouldFeatureRecurringSponsors
                  ? "origin-left scale-125 object-left sm:scale-150"
                  : undefined
              }
              size={sponsorSize}
              placement={id}
            />
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
