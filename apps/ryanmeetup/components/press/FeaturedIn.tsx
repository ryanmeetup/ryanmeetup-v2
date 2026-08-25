"use client";

// Components
import { LogoMarquee } from "@ryanmeetup/ui";

// Types
import type { Outlet } from "@/lib/types";

// Utilities
import { useTheme } from "next-themes";
import { convertImageUrl } from "@ryanmeetup/utils";

type FeaturedInProps = {
  outlets: Outlet[];
};

const FeaturedIn = (props: FeaturedInProps) => {
  const { theme } = useTheme();

  const { outlets } = props;

  return (
    <div className="mt-4">
      <LogoMarquee
        items={outlets.map((outlet) => ({
          src: (theme === "light"
            ? convertImageUrl(outlet.lightModeImage)
            : convertImageUrl(outlet.darkModeImage)) as string,
          alt: outlet.title,
          href: outlet.href,
          key: outlet.title,
          imageClassName: "h-10 sm:h-12 md:h-16 lg:h-20",
          width: 300,
          height: 80,
        }))}
        itemVariant="plain"
        itemClassName="mx-8"
      />
    </div>
  );
};

export { FeaturedIn };
