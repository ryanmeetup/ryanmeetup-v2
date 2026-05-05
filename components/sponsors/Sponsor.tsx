"use client";

// Components
import NextImage from "next/image";
import { Card } from "@/components/global";
import { SponsorLink } from "@/components/sponsors/SponsorLink";

// Types
import type { Sponsor } from "@/lib/types";

// Utilities
import { convertImageUrl } from "@/utils/convert";
import { useTheme } from "next-themes";

type SponsorProps = {
  sponsor: Sponsor;
  className?: string;
  imageWrapperClassName?: string;
  imageClassName?: string;
  size?: "default" | "featured" | "compact";
  placement?: string;
};

const Sponsor = (props: SponsorProps) => {
  const { name, darkModeImage, lightModeImage, href, partnershipType } =
    props.sponsor;
  const {
    className,
    imageWrapperClassName,
    imageClassName,
    size = "default",
    placement = "sponsor_grid",
  } = props;

  const { resolvedTheme } = useTheme();
  const isLight = (resolvedTheme ?? "dark") === "light";

  return (
    <SponsorLink
      href={href}
      sponsorName={name}
      placement={placement}
      partnershipType={partnershipType}
      className={`group flex w-full ${className}`}
    >
      <Card
        variant="soft"
        size={size === "default" ? "md" : "sm"}
        hover
        className="w-full text-center"
      >
        <div
          className={`relative mx-auto w-full max-w-[660px] ${
            size === "default"
              ? "h-48 sm:h-[216px]"
              : size === "featured"
                ? "h-32 sm:h-36"
                : "h-24 sm:h-28"
          } ${imageWrapperClassName ?? ""}`}
        >
          <NextImage
            src={
              isLight
                ? (convertImageUrl(lightModeImage) as string)
                : (convertImageUrl(darkModeImage) as string)
            }
            fill
            alt={name}
            className={`object-contain ${imageClassName ?? ""}`}
            sizes="(min-width: 1280px) 660px, (min-width: 640px) 540px, 480px"
          />
        </div>
      </Card>
    </SponsorLink>
  );
};

export { Sponsor };
