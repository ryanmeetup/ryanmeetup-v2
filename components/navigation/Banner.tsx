"use client";

// Components
import NextLink from "next/link";
import { layoutPaddingX } from "@/lib/constants";

const Banner = () => {
  return (
    <div className={`font-cooper text-white  bg-[#073326] py-1 ${layoutPaddingX}`}>
      We're heading to Minneapolis on Saturday, July 25 for the Ryan Baseball Classic! See you there, Ryan.{" "}
      <NextLink href="/rsvp" className="underline hover:text-[#ad8f4f]">
        RSVP today
      </NextLink>
      .
    </div>
  );
};

export { Banner };
