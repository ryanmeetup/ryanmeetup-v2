"use client";

import type { ReactNode } from "react";

import { DisclosureCard, Heading, Pill } from "@ryanmeetup/ui";

type CollapsibleYearSectionProps = {
  year: string;
  countLabel: string;
  id: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  headingClassName?: string;
  dividerClassName?: string;
  panelClassName?: string;
  iconClassName?: string;
  leadingMarker?: ReactNode;
};

const CollapsibleYearSection = (props: CollapsibleYearSectionProps) => {
  const {
    year,
    countLabel,
    id,
    children,
    defaultOpen = true,
    className = "space-y-4",
    headerClassName = "",
    headingClassName = "text-2xl title sm:text-3xl",
    dividerClassName = "left-0",
    panelClassName = "",
    iconClassName = "h-3.5 w-3.5",
    leadingMarker,
  } = props;

  return (
    <DisclosureCard
      id={id}
      defaultOpen={defaultOpen}
      className={`w-full ${className}`}
      buttonClassName={`group relative flex w-full items-center justify-between gap-4 pb-3 text-left ${headerClassName}`}
      panelClassName={panelClassName}
      iconClassName={`${iconClassName} text-black/55 timing dark:text-white/55`}
      summary={
        <>
          {leadingMarker}
          <div
            className={`absolute bottom-0 right-0 h-px bg-black/10 transition group-hover:bg-black/20 dark:bg-white/10 dark:group-hover:bg-white/20 ${dividerClassName}`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Heading className={headingClassName} size="h3">
              {year}
            </Heading>
            <Pill variant="neutral" size="md">
              {countLabel}
            </Pill>
          </div>
        </>
      }
    >
      {children}
    </DisclosureCard>
  );
};

export { CollapsibleYearSection };
