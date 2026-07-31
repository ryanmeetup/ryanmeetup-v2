// Components
import NextLink from "next/link";
import NextImage from "next/image";
import { Heading } from "@/components/global";

// Utilities
import { RyanChapter } from "@/lib/types";
import { convertImageUrl } from "@/utils/convert";

type ChapterTileProps = {
  chapter: RyanChapter;
  showBanner?: boolean;
};

const ChapterTile = (props: ChapterTileProps) => {
  const { city, slug, state, coverImage } = props.chapter;
  const { showBanner = false } = props;

  return (
    <NextLink href={`/chapters/${slug}`} className="group">
      <div className="border flex flex-col relative overflow-hidden items-center justify-center rounded-2xl h-52 timing border-black/15 bg-amber-50/80 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-black/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/40 sm:h-72">
        {showBanner && (
          <div className="absolute top-6 -left-[62px] lg:top-12 lg:-left-[40px] -rotate-45 z-10">
            <div className="px-2 text-[10px] text-center rounded-lg font-semibold uppercase w-[200px] h-6 flex items-center justify-center bg-red-500 lg:text-sm">
              UPCOMING EVENT
            </div>
          </div>
        )}
        <div className="relative w-full flex items-center justify-center rounded-2xl h-56 overflow-hidden bg-center sm:h-80">
          <div className="w-full h-full brightness-30 transition group-hover:brightness-50">
            <NextImage
              src={
                convertImageUrl(coverImage) ?? "/group-photos/ryanroundup.png"
              }
              alt={`${city} Chapter`}
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="absolute w-full inset-x-0 text-white text-xs text-center leading-4 flex items-center justify-center flex-col sm:px-8 xl:px-6">
            <Heading className="text-lg sm:text-3xl text-white" size="h2">
              {city}
            </Heading>
            <Heading className="text-base sm:text-xl text-white" size="h3">
              {state}
            </Heading>
          </div>
        </div>
      </div>
    </NextLink>
  );
};

export { ChapterTile };
