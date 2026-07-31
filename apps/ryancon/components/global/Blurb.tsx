"use client";

// Components
import { Heading, Button, Pill } from "@/components/global";

// Types
import type { ReactNode } from "react";

type BlurbProps = {
  fullHeadline: string;
  smallHeadline?: string;
  children: ReactNode;
  href?: string;
  icon?: ReactNode;
  hrefText?: string;
  secondaryHref?: string;
  secondaryIcon?: ReactNode;
  secondaryHrefText?: string;
  tag?: string;
};

const Blurb = (props: BlurbProps) => {
  const {
    fullHeadline,
    smallHeadline = fullHeadline,
    children,
    href,
    icon,
    hrefText,
    secondaryHref,
    secondaryIcon,
    secondaryHrefText,
    tag,
  } = props;

  return (
    <div>
      {tag && (
        <div className="mb-4 flex justify-center">
          <Pill>{tag}</Pill>
        </div>
      )}
      <div className="hidden xl:block">
        <Heading className="mb-6 text-center text-7xl title" size="h1">
          {fullHeadline}
        </Heading>
      </div>

      <div className="block xl:hidden">
        <Heading className="mb-6 text-center text-5xl title" size="h1">
          {smallHeadline}
        </Heading>
      </div>

      <div className="text-center">
        {children}

        {href && (
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            {secondaryHref && secondaryHrefText && (
              <Button.Link
                className="sm:min-w-[220px]"
                href={secondaryHref}
                leftIcon={secondaryIcon}
                variant="primary"
                size="md"
                fullWidth
                newTab={false}
              >
                {secondaryHrefText}
              </Button.Link>
            )}
            <Button.Link
              className="sm:min-w-[220px]"
              href={href}
              leftIcon={icon}
              variant="secondary"
              size="md"
              fullWidth
              newTab={false}
            >
              {hrefText}
            </Button.Link>
          </div>
        )}
      </div>
    </div>
  );
};

export { Blurb };
