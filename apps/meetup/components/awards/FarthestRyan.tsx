// Components
import NextImage from "next/image";
import NextLink from "next/link";
import { Heading, Text } from "@/components/global";
import { FaInstagram as Instagram } from "react-icons/fa";

// Types
import type { TravelingRyan } from "@/lib/types";

// Utilities
import { convertImageUrl } from "@/utils/convert";
import { formatEventLabel } from "@/utils/date";

type FarthestRyanProps = {
  ryan: TravelingRyan;
};

const FarthestRyan = (props: FarthestRyanProps) => {
  const {
    fullName,
    headshot,
    traveledTo,
    traveledFrom,
    milesTraveled,
    event,
    eventDate,
    date,
    instagram,
  } = props.ryan;
  const displayDate = formatEventLabel({ date, eventDate });

  const imageUrl = convertImageUrl(headshot);

  return (
    <div className="group rounded-2xl border border-black/10 bg-white/90 p-6 text-center shadow-[0_25px_50px_-40px_rgba(0,0,0,0.6)] transition space-y-1 hover:-translate-y-1 hover:border-black/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/40">
      <div className="relative mx-auto mb-5 h-72 w-72 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/10">
        <NextImage
          className="rounded-full"
          src={imageUrl ?? "/trophy.png"}
          fill={true}
          alt={fullName}
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Heading className="text-2xl title" size="h3">
          {fullName}
        </Heading>
        {instagram && (
          <NextLink
            className="inline-flex items-center justify-center rounded-full p-1 transition hover:bg-blue-500/15"
            href={instagram}
            aria-label={`${fullName}'s Instagram`}
          >
            <Instagram className="h-4 w-4 fill-black transition hover:fill-blue-500 dark:fill-white" />
          </NextLink>
        )}
      </div>
      <Text className="mt-3 text-sm uppercase tracking-[0.2em] text-black/70 dark:text-white/70">
        {milesTraveled} miles traveled
      </Text>
      <Text className="mt-2 text-black/70 dark:text-white/70">
        <span className="font-semibold text-lg text-blue-700 dark:text-blue-500">
          {traveledFrom}
        </span>{" "}
        →{" "}
        <span className="font-semibold text-lg text-blue-700 dark:text-blue-500">
          {traveledTo}
        </span>
      </Text>
      <Text className="mt-2 text-black/70 dark:text-white/70">
        <span className="font-cooper text-black dark:text-white">{event}</span> • {displayDate}
      </Text>
    </div>
  );
};

export { FarthestRyan };
