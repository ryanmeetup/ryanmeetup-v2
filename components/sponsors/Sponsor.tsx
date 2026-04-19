"use client";

// Components
import NextImage from "next/image";
import NextLink from "next/link";
import { Card } from "@/components/global";

// Types
import type { Sponsor } from "@/lib/types";

// Utilities
import { convertImageUrl } from "@/utils/convert";
import { useTheme } from "next-themes";

type SponsorProps = {
  sponsor: Sponsor;
  className?: string;
  imageWrapperClassName?: string;
  size?: "default" | "featured" | "compact";
};

const Sponsor = (props: SponsorProps) => {
  const { name, darkModeImage, lightModeImage, href } = props.sponsor;
  const { className, imageWrapperClassName, size = "default" } = props;

  const { resolvedTheme } = useTheme();
  const isLight = (resolvedTheme ?? "dark") === "light";

  return (
    <NextLink href={href} className={`group flex w-full ${className}`}>
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
            className="object-contain"
            sizes="(min-width: 1280px) 660px, (min-width: 640px) 540px, 480px"
          />
        </div>
      </Card>
    </NextLink>
  );
};

export { Sponsor };
