// Components
import { Heading, Text } from "@/components/global";
import NextImage from "next/image";
import NextLink from "next/link";

// Types
import type { MediaEvent } from "@/lib/types";

// Utilities
import { convertImageUrl } from "@/utils/convert";
import { formatEventLabel } from "@/utils/date";

type MediaTileProps = {
  id: string;
  data: MediaEvent;
};

const MediaTile = (props: MediaTileProps) => {
  const { title, eventDate, date, bgImage, photoUrl, credits } = props.data;
  const displayDate = formatEventLabel({ date, eventDate });

  return (
    <NextLink href={photoUrl} className="group">
      <div className="border flex flex-col items-center justify-center rounded-2xl h-full timing border-black/15 bg-amber-50/80 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-black/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/40">
        <div className="relative w-full flex items-center justify-center rounded-2xl h-80 overflow-hidden bg-center">
          <div className="w-full h-full brightness-30 transition group-hover:brightness-50">
            <NextImage
              src={convertImageUrl(bgImage) ?? "/trophy.png"}
              alt={title}
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="absolute w-full inset-x-0 text-white text-xs text-center leading-4 flex items-center justify-center flex-col px-8">
            <Heading className="text-4xl text-white" size="h2">
              {title}
            </Heading>
            <Heading className="text-xl text-white" size="h3">
              {displayDate}
            </Heading>
          </div>
          {credits && (
            <Heading className="absolute bottom-0 left-0 p-2 font-cooper text-sm">
              Addl. photo credits to{" "}
              {credits.map((credit, index) => (
                <span key={credit}>
                  {credit}{" "}
                  {credits.length > 1 && index !== credits.length - 1 && ","}
                </span>
              ))}
            </Heading>
          )}
        </div>
      </div>
    </NextLink>
  );
};

export { MediaTile };
