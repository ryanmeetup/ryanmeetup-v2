"use client";

// Components
import NextLink from "next/link";
import { layoutPaddingX } from "@/lib/constants";

const Banner = () => {
  return (
    <div className="font-cooper">
      <div className={`bg-[#4a2f14] py-1 text-[#fff4d6] ${layoutPaddingX}`}>
        We&apos;re heading to Minneapolis to Ryde the Ryan Coaster on Friday,
        July 24.{" "}
        <NextLink href="/coaster" className="underline hover:text-white">
          RSVP today
        </NextLink>
        .
      </div>
      <div className={`bg-[#0f2741] py-1 text-white ${layoutPaddingX}`}>
        Then, we&apos;ll be hosting the Ryan Baseball Classic the next day on
        Saturday, July 25! See you there, Ryan.{" "}
        <NextLink href="/baseball" className="underline hover:text-[#d31145]">
          RSVP today
        </NextLink>
        .
      </div>
      <div className={`bg-[#f4f4d2] py-1 text-[#0f2741] ${layoutPaddingX}`}>
        After that, we&apos;re headed to Ryan, Iowa on Sunday, July 26.{" "}
        <NextLink href="/iowa" className="underline hover:text-[#d31145]">
          RSVP today
        </NextLink>
        .
      </div>
    </div>
  );
};

export { Banner };
