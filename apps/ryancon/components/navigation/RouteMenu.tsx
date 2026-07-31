// Components
import {
  Transition,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { Divider } from "@/components/global";
import { FaChevronDown as ChevronDown } from "react-icons/fa6";
import NextLink from "next/link";

// Types
import type { Route } from "@/lib/types";
import type { ReactNode } from "react";

type RouteMenuProps = {
  icon: ReactNode;
  title: string;
  routes: Route[];
  pathname: string;
};

const RouteMenu = (props: RouteMenuProps) => {
  const { icon, title, routes, pathname } = props;

  const isSelected = (currentPath: string) => {
    const matchesRoute = routes.some((route) => route.href === currentPath);
    return matchesRoute
      ? "bg-black/15 text-black shadow-sm ring-1 ring-black/10 dark:bg-white/25 dark:text-white dark:ring-white/20"
      : "";
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton
            className={`flex items-center gap-x-2 rounded-full px-3 py-2 text-xs font-semibold tracking-wide text-black transition hover:bg-black/5 hover:shadow-sm dark:text-white dark:hover:bg-white/10 2xl:px-4 2xl:text-sm ${
              isSelected(pathname) ?? ""
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
              className="z-50 w-fit rounded-xl border border-black/10 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-black/95"
              anchor="bottom"
            >
              {routes.map((route, index) => (
                <div key={route.text}>
                  <NextLink
                    className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-black transition hover:bg-black/5 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/10 xl:text-sm"
                    href={route.href}
                  >
                    <span className="flex items-center gap-2">
                      {route.icon} {route.text}
                    </span>
                    <span className="text-[10px] opacity-0 transition group-hover:opacity-100 xl:text-xs">
                      →
                    </span>
                  </NextLink>
                  {index !== routes.length - 1 && <Divider margins="sm" />}
                </div>
              ))}
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export { RouteMenu };
