"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@ryanmeetup/ui";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";

const photos = [
  {
    src: "/hero/ryan-merch-table.jpg",
    alt: "Ryans browsing official Ryan Meetup shirts and hats at a merch table",
    label: "The Ryan merch table",
  },
  {
    src: "/hero/ryans-game-show.jpg",
    alt: "A crowd of Ryans wearing Ryan name-tag shirts at Ryan's Game Show",
    label: "Ryan’s Game Show",
  },
  {
    src: "/hero/ryan-baseball-classic.jpg",
    alt: "Ryans in event shirts cheering together at the Ryan Baseball Classic",
    label: "Ryan Baseball Classic",
  },
  {
    src: "/hero/rytoberfest.jpg",
    alt: "A large group of Ryans wearing Ryan shirts at Rytoberfest",
    label: "Rytoberfest",
  },
];

const getIndex = (index: number) => (index + photos.length) % photos.length;

export function HeroGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [turningIndex, setTurningIndex] = useState<number | null>(null);
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">(
    "next",
  );
  const turnTimeout = useRef<number | null>(null);

  const turnTo = useCallback(
    (nextIndex: number, direction: "next" | "previous") => {
      if (nextIndex === activeIndex) return;

      if (turnTimeout.current) window.clearTimeout(turnTimeout.current);
      setTurningIndex(activeIndex);
      setTurnDirection(direction);
      setActiveIndex(nextIndex);
      turnTimeout.current = window.setTimeout(() => {
        setTurningIndex(null);
        turnTimeout.current = null;
      }, 700);
    },
    [activeIndex],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => {
        setTurningIndex(current);
        setTurnDirection("next");
        if (turnTimeout.current) window.clearTimeout(turnTimeout.current);
        turnTimeout.current = window.setTimeout(() => {
          setTurningIndex(null);
          turnTimeout.current = null;
        }, 700);
        return getIndex(current + 1);
      });
    }, 3800);

    return () => {
      window.clearInterval(interval);
      if (turnTimeout.current) window.clearTimeout(turnTimeout.current);
    };
  }, []);

  const showPrevious = () => turnTo(getIndex(activeIndex - 1), "previous");
  const showNext = () => turnTo(getIndex(activeIndex + 1), "next");

  return (
    <div
      className="relative mx-auto w-full max-w-2xl pb-16"
      aria-roledescription="carousel"
      aria-label="Ryans wearing Ryan Meetup merch"
    >
      <figure className="group/gallery relative aspect-[4/3]">
        <div className="absolute inset-0 translate-y-2 rounded-[1.75rem] border border-black/10 bg-black/15 shadow-xl dark:border-white/10 dark:bg-white/10" />
        <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] border border-black/15 bg-black shadow-2xl [perspective:1400px] dark:border-white/15">
          <Image
            key={photos[activeIndex].src}
            src={photos[activeIndex].src}
            alt={photos[activeIndex].alt}
            fill
            priority={activeIndex === 0}
            sizes="(min-width: 1536px) 560px, (min-width: 1024px) 42vw, 92vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10"
          />

          {turningIndex !== null ? (
            <div
              aria-hidden
              className={`store-gallery-turn absolute inset-0 ${
                turnDirection === "next"
                  ? "store-gallery-turn-next"
                  : "store-gallery-turn-previous"
              }`}
            >
              <Image
                src={photos[turningIndex].src}
                alt=""
                fill
                sizes="(min-width: 1536px) 560px, (min-width: 1024px) 42vw, 92vw"
                className="object-cover"
              />
              <div className="store-gallery-page-shadow absolute inset-0" />
            </div>
          ) : null}

          <div
            aria-hidden
            className="absolute right-0 top-0 h-16 w-16 bg-[linear-gradient(225deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_38%,transparent_40%)] opacity-60 transition-all duration-300 group-hover/gallery:h-20 group-hover/gallery:w-20 group-hover/gallery:opacity-90"
          />

          <figcaption
            className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white"
            aria-live="polite"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                Seen on Ryans
              </p>
              <p className="mt-1 font-cooper text-lg tracking-wide sm:text-xl">
                {photos[activeIndex].label}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] backdrop-blur">
              Page {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(photos.length).padStart(2, "0")}
            </span>
          </figcaption>
        </div>
      </figure>

      <div className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-black/10 bg-white/80 p-1.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-black/65">
        <IconButton
          label="Show previous merch photo"
          variant="overlay"
          size="md"
          tooltip={false}
          onClick={showPrevious}
        >
          <FiArrowLeft aria-hidden />
        </IconButton>
        <div className="flex items-center gap-1.5 px-1" aria-hidden>
          {photos.map((photo, index) => (
            <span
              key={photo.src}
              className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                index === activeIndex
                  ? "w-6 bg-black dark:bg-white"
                  : "w-1.5 bg-black/25 dark:bg-white/30"
              }`}
            />
          ))}
        </div>
        <IconButton
          label="Show next merch photo"
          variant="overlay"
          size="md"
          tooltip={false}
          onClick={showNext}
        >
          <FiArrowRight aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
