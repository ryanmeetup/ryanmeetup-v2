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
            sponsorSize === "default"
              ? "sm:grid-cols-2 lg:grid-cols-3"
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
              size={sponsorSize}
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
