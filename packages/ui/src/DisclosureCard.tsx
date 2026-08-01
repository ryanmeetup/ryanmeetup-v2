"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import { FaChevronDown as ChevronDown } from "react-icons/fa";
import type { ReactNode } from "react";

export type DisclosureCardProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  iconClassName?: string;
  id?: string;
};

const DisclosureCard = ({
  summary,
  children,
  defaultOpen = false,
  className = "rounded-2xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5",
  buttonClassName = "flex w-full items-center justify-between gap-4 p-5 text-left",
  panelClassName = "px-5 pb-5",
  iconClassName = "h-4 w-4",
  id,
}: DisclosureCardProps) => (
  <Disclosure as="div" className={className} defaultOpen={defaultOpen}>
    {({ open }) => (
      <>
        <DisclosureButton
          id={id}
          className={`cursor-pointer ${buttonClassName}`}
        >
          <span className="min-w-0 flex-1">{summary}</span>
          <ChevronDown
            className={`${iconClassName} shrink-0 transition-transform duration-200 ${open ? "-rotate-180" : ""}`}
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
      </>
    )}
  </Disclosure>
);

export { DisclosureCard };
