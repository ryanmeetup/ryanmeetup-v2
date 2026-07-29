"use client";

import type { ReactNode } from "react";

import { Badge } from "./Badge";
import { Heading } from "./Heading";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import { FaChevronDown as ChevronDown } from "react-icons/fa";

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
    <Disclosure as="div" className="w-full" defaultOpen={defaultOpen}>
      {({ open }) => (
        <div className={className}>
          <DisclosureButton
            id={id}
            className={`group relative flex w-full items-center justify-between gap-4 pb-3 text-left ${headerClassName}`}
          >
            {leadingMarker}
            <div
              className={`absolute bottom-0 right-0 h-px bg-black/10 transition group-hover:bg-black/20 dark:bg-white/10 dark:group-hover:bg-white/20 ${dividerClassName}`}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Heading className={headingClassName} size="h3">
                {year}
              </Heading>
              <Badge variant="neutral" size="md">
                {countLabel}
              </Badge>
            </div>
            <ChevronDown
              className={`${iconClassName} shrink-0 text-black/55 timing dark:text-white/55 ${open && "-rotate-180"}`}
            />
          </DisclosureButton>

          <div className="overflow-hidden">
            <Transition
              enter="duration-200 ease-in-out"
              enterFrom="opacity-0 -translate-y-4"
              enterTo="opacity-100 translate-y-0"
              leave="duration-200 ease-in-out"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-4"
            >
              <DisclosurePanel
                className={`origin-top transition ${panelClassName}`}
              >
                {children}
              </DisclosurePanel>
            </Transition>
          </div>
        </div>
      )}
    </Disclosure>
  );
};

export { CollapsibleYearSection };
