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
        itemClassName="mx-8 border-0 bg-transparent hover:scale-105 dark:border-0 dark:bg-transparent"
      />
    </div>
  );
};

export { FeaturedIn };
