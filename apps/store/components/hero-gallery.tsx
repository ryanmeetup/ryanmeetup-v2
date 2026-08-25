"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => getIndex(current + 1));
    }, 3800);

    return () => window.clearInterval(interval);
  }, []);

  const showPrevious = () => setActiveIndex((current) => getIndex(current - 1));
  const showNext = () => setActiveIndex((current) => getIndex(current + 1));

  return (
    <div
      className="relative mx-auto w-full max-w-2xl pb-8 sm:px-8 sm:pb-10 lg:px-0 lg:pb-12"
      aria-roledescription="carousel"
      aria-label="Ryans wearing Ryan Meetup merch"
    >
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 h-[86%] w-[76%] -translate-x-[43%] rotate-6 overflow-hidden rounded-[1.6rem] border border-black/10 bg-[#b9c8ba] shadow-lg dark:border-white/10 dark:bg-[#28332d]"
      >
        <Image
          src={photos[getIndex(activeIndex + 2)].src}
          alt=""
          fill
          sizes="(min-width: 1024px) 38vw, 75vw"
          className="object-cover opacity-65 grayscale-[20%]"
        />
      </div>
      <div
        aria-hidden
        className="absolute bottom-2 left-1/2 h-[90%] w-[82%] -translate-x-[58%] -rotate-5 overflow-hidden rounded-[1.6rem] border border-black/10 bg-[#d7c398] shadow-lg dark:border-white/10 dark:bg-[#463f31]"
      >
        <Image
          src={photos[getIndex(activeIndex + 1)].src}
          alt=""
          fill
          sizes="(min-width: 1024px) 40vw, 80vw"
          className="object-cover opacity-75 grayscale-[12%]"
        />
      </div>

      <figure className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-black/15 bg-black shadow-2xl dark:border-white/15">
        {photos.map((photo, index) => (
          <Image
            key={photo.src}
            src={photo.src}
            alt={index === activeIndex ? photo.alt : ""}
            fill
            priority={index === 0}
            sizes="(min-width: 1536px) 560px, (min-width: 1024px) 42vw, 92vw"
            className={`object-cover transition-opacity duration-300 motion-reduce:transition-none ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10"
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
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(photos.length).padStart(2, "0")}
          </span>
        </figcaption>
      </figure>

      <div className="absolute bottom-0 right-3 z-10 flex gap-2 sm:right-0">
        <IconButton
          label="Show previous merch photo"
          variant="overlay"
          size="md"
          tooltip={false}
          onClick={showPrevious}
        >
          <FiArrowLeft aria-hidden />
        </IconButton>
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
