"use client";

// Components
import NextImage from "next/image";
import NextLink from "next/link";
import { Card } from "@/components/global";

// Types
import type { Sponsor } from "@/lib/types";

// Utilities
import { convertImageUrl } from "@/utils/convert";

type SponsorProps = {
  sponsor: Sponsor;
  className?: string;
  imageWrapperClassName?: string;
};

const Sponsor = (props: SponsorProps) => {
  const { name, image, href } = props.sponsor;
  const { className, imageWrapperClassName } = props;
  const imageUrl = convertImageUrl(image);

  if (!imageUrl) {
    return null;
  }

  return (
    <NextLink
      href={href}
      className={`group flex w-full ${className}`}
    >
      <Card
        variant="soft"
        size="md"
        hover
        className="w-full text-center"
      >
        <div
          className={`relative mx-auto h-48 w-full max-w-[660px] sm:h-[216px] ${imageWrapperClassName ?? ""}`}
        >
          <NextImage
            src={imageUrl}
            fill
            alt={name}
            className="object-contain"
            sizes="(min-width: 1280px) 660px, (min-width: 640px) 540px, 480px"
          />
        </div>
      </Card>
    </NextLink>
  );
};

export { Sponsor };
