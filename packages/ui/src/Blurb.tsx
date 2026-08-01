import type { ReactNode } from "react";
import { Button } from "./Button";
import { Heading } from "./Heading";
import { Pill } from "./Pill";

export type BlurbProps = {
  fullHeadline: string;
  smallHeadline?: string;
  fullHeadlineNode?: ReactNode;
  smallHeadlineNode?: ReactNode;
  children: ReactNode;
  href?: string;
  icon?: ReactNode;
  hrefText?: string;
  secondaryHref?: string;
  secondaryIcon?: ReactNode;
  secondaryHrefText?: string;
  tag?: string;
};

const Blurb = ({
  fullHeadline,
  smallHeadline = fullHeadline,
  fullHeadlineNode,
  smallHeadlineNode,
  children,
  href,
  icon,
  hrefText,
  secondaryHref,
  secondaryIcon,
  secondaryHrefText,
  tag,
}: BlurbProps) => (
  <div>
    {tag && (
      <div className="mb-4 flex justify-center">
        <Pill>{tag}</Pill>
      </div>
    )}
    <div className="hidden xl:block">
      <Heading className="mb-6 text-center text-7xl title" size="h1">
        {fullHeadlineNode ?? fullHeadline}
      </Heading>
    </div>
    <div className="block xl:hidden">
      <Heading className="mb-6 text-center text-5xl title" size="h1">
        {smallHeadlineNode ?? smallHeadline}
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
          >
            {hrefText}
          </Button.Link>
        </div>
      )}
    </div>
  </div>
);

export { Blurb };
