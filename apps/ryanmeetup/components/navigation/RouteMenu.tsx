"use client";

// Components
import {
  Transition,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { Text } from "@/components/global";
import { FaChevronDown as ChevronDown } from "react-icons/fa6";
import NextLink from "next/link";

// Types
import type { Route } from "@/lib/types";
import { useRef } from "react";
import type { ReactNode } from "react";
import { getRouteMenuActiveClass } from "@/utils/navigation";

type RouteMenuProps = {
  icon: ReactNode;
  title: string;
  routes: Route[];
  pathname: string;
};

const RouteMenu = (props: RouteMenuProps) => {
  const { icon, title, routes, pathname } = props;
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const isSelected = (pathname: string) =>
    getRouteMenuActiveClass(title, pathname);

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <div
          onMouseEnter={() => {
            if (!open) {
              buttonRef.current?.click();
            }
          }}
          onMouseLeave={() => {
            if (open) {
              close();
            }
          }}
        >
          <PopoverButton
            ref={buttonRef}
              className={`flex items-center gap-x-2 rounded-full px-3 py-2 text-xs font-semibold tracking-wide text-black transition hover:bg-black/5 hover:shadow-sm dark:text-white dark:hover:bg-white/10 2xl:px-4 2xl:text-sm ${
              isSelected(pathname)
            }`}
          >
            {icon} {title}{" "}
            <ChevronDown
              className={`h-3 w-3 dark:fill-gray-200 fill-gray-700 timing ${open && "-rotate-180"}`}
            />
          </PopoverButton>

          <Transition
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel
              className="z-50 w-[720px] rounded-2xl border border-black/10 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-black/95"
              anchor="bottom"
            >
              <div className="grid grid-cols-3 grid-rows-2 gap-3">
                {routes.map((route) => (
                  <NextLink
                    key={route.text}
                    className="group cursor-pointer rounded-xl border border-transparent px-3 py-2 transition hover:border-black/10 hover:bg-black/5 dark:hover:border-white/10 dark:hover:bg-white/10"
                    href={route.href}
                  >
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold tracking-wide text-black dark:text-white xl:text-base">
                      <span className="flex items-center gap-2">
                        {route.icon} {route.text}
                      </span>
                      <span className="text-xs opacity-0 transition group-hover:opacity-100">
                        →
                      </span>
                    </div>
                    {route.description && (
                        <Text className="mt-1 text-sm leading-relaxed text-black/70 dark:text-white/70">
                          {route.description}
                        </Text>
                    )}
                  </NextLink>
                ))}
              </div>
            </PopoverPanel>
          </Transition>
        </div>
      )}
    </Popover>
  );
};

export { RouteMenu };
