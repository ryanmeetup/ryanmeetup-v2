import { EmptyState, SectionHeader } from "@ryanmeetup/ui";
import { SponsorLogoCard } from "./SponsorLogo";
import type { SponsorLogo } from "./SponsorLogo";

export type SponsorSectionProps = {
  id?: string;
  title: string;
  description?: string;
  sponsors: SponsorLogo[];
  meta?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
  gridClassName?: string;
  cardClassName?: string;
  imageClassName?: string;
};

const SponsorSection = ({
  id,
  title,
  description,
  sponsors,
  meta,
  emptyMessage = "Nothing to show here yet.",
  className,
  gridClassName = "sm:grid-cols-2 xl:grid-cols-3",
  cardClassName = "h-56 p-6",
  imageClassName = "h-40",
}: SponsorSectionProps) => (
  <section id={id} className={`space-y-6 ${className ?? ""}`}>
    <SectionHeader
      title={title}
      description={description}
      meta={meta ?? `${sponsors.length} partners`}
    />
    {sponsors.length ? (
      <div className={`grid gap-4 ${gridClassName}`}>
        {sponsors.map((sponsor) => (
          <SponsorLogoCard
            key={sponsor.name}
            {...sponsor}
            className={cardClassName}
            imageClassName={imageClassName}
          />
        ))}
      </div>
    ) : (
      <EmptyState message={emptyMessage} />
    )}
  </section>
);

export { SponsorSection };
