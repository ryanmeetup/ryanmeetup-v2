"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import { FaChevronDown as ChevronDown } from "react-icons/fa";
import { useRef, type ReactNode } from "react";

export type DisclosureCardProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  iconClassName?: string;
  id?: string;
  actions?: ReactNode;
  actionsClassName?: string;
  description?: ReactNode;
  collapsible?: boolean;
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
  actions,
  actionsClassName = "absolute right-0 top-1/2 -translate-y-1/2",
  description,
  collapsible = true,
}: DisclosureCardProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!collapsible)
    return (
      <div className={className}>
        <div
          className={`relative ${actions ? "flex min-h-10 flex-col justify-center" : ""}`}
        >
          <div className={buttonClassName}>
            <span className="min-w-0 flex-1">{summary}</span>
          </div>
          {description && <div className="-mt-1">{description}</div>}
          {actions && (
            <div className={actionsClassName}>{actions}</div>
          )}
        </div>
        <div>{children}</div>
      </div>
    );

  return (
    <Disclosure as="div" className={className} defaultOpen={defaultOpen}>
      {({ open }) => (
        <>
          <div
            className={`relative ${actions ? "flex min-h-10 flex-col justify-center" : ""}`}
            onClick={(event) => {
              if (
                actions &&
                !open &&
                !buttonRef.current?.contains(event.target as Node)
              )
                buttonRef.current?.click();
            }}
          >
            <DisclosureButton
              ref={buttonRef}
              id={id}
              className={`cursor-pointer ${buttonClassName}`}
            >
              <span className="min-w-0 flex-1">{summary}</span>
              <ChevronDown
                className={`${iconClassName} shrink-0 transition-transform duration-200 ${open ? "-rotate-180" : ""}`}
              />
            </DisclosureButton>
            {description && <div className="-mt-1">{description}</div>}
            {actions && (
              <div className={actionsClassName}>{actions}</div>
            )}
          </div>
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
};

export { DisclosureCard };
