"use client";

// Components
import NextImage from "next/image";
import NextLink from "next/link";
import Marquee from "react-fast-marquee";

// Types
import type { Outlet } from "@/lib/types";

// Utilities
import { useTheme } from "next-themes";
import { convertImageUrl } from "@/utils/convert";

type FeaturedInProps = {
  outlets: Outlet[];
};

const FeaturedIn = (props: FeaturedInProps) => {
  const { theme } = useTheme();

  const { outlets } = props;

  return (
    <div className="mt-4">
      <Marquee speed={50} gradient={false}>
        {outlets.map((outlet, idx) => (
          <div key={idx} className="mx-8 flex items-center justify-center">
            <NextLink href={outlet.href} className="timing hover:scale-105">
              <NextImage
                src={
                  theme === "light"
                    ? (convertImageUrl(outlet.lightModeImage) as string)
                    : (convertImageUrl(outlet.darkModeImage) as string)
                }
                alt={outlet.title}
                width={0}
                height={40}
                className="h-10 sm:h-12 md:h-16 lg:h-20 w-auto object-contain"
                sizes="(max-width: 768px) 100px, 300px"
              />
            </NextLink>
          </div>
        ))}
      </Marquee>
    </div>
  );
};

export { FeaturedIn };
