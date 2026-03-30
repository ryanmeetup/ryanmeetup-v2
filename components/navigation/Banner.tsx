"use client";

// Components
import NextLink from "next/link";
import { layoutPaddingX } from "@/lib/constants";

const Banner = () => {
  return (
    <div className={`font-cooper text-white  bg-[#0f2741] py-1 ${layoutPaddingX}`}>
      We&apos;re heading to Minneapolis on Saturday, July 25 for the Ryan Baseball Classic! See you there, Ryan.{" "}
      <NextLink href="/rsvp" className="underline hover:text-[#d31145]">
        RSVP today
      </NextLink>
      .
    </div>
  );
};

export { Banner };
