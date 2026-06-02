"use client";

// Components
import NextLink from "next/link";
import { layoutPaddingX } from "@/lib/constants";

const Banner = () => {
  return (
    <div className="font-cooper">
      <div className={`bg-[#0f2741] py-1 text-white ${layoutPaddingX}`}>
        We&apos;re heading to Minneapolis on Saturday, July 25 for the Ryan
        Baseball Classic! See you there, Ryan.{" "}
        <NextLink href="/baseball" className="underline hover:text-[#d31145]">
          RSVP today
        </NextLink>
        .
      </div>
      <div className={`bg-[#234315] py-1 text-[#f4f4d2] ${layoutPaddingX}`}>
        Copa del Ryan kicks off in Brooklyn on Friday, June 26.{" "}
        <NextLink href="/copa" className="underline hover:text-white">
          RSVP today
        </NextLink>
        .
      </div>
    </div>
  );
};

export { Banner };
