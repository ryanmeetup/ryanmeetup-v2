import { cloneElement, isValidElement } from "react";

// Components
import { Divider, Button, Kicker } from "@/components/global";
import { FaRegNewspaper as News } from "react-icons/fa";
import NextLink from "next/link";

// Utilities
import { socials } from "@/lib/constants";

const FollowUs = () => {
  const renderIcon = (icon: React.ReactNode, className: string) => {
    if (!isValidElement(icon)) return null;
    const element = icon as React.ReactElement<{ className?: string }>;
    const mergedClassName = element.props.className
      ? `${element.props.className} ${className}`
      : className;
    return cloneElement(element, { className: mergedClassName });
  };

  return (
    <div className="col-span-2 md:col-span-1 dark:text-white text-black">
      <Kicker className="mb-3 hidden xl:block">Find us online</Kicker>
      <div className="grid grid-cols-3 gap-2">
        {socials.map((outlet) => (
          <NextLink
            href={outlet.href}
            key={outlet.text}
            target="_blank"
            rel="noreferrer"
            aria-label={`${outlet.ctaVerb ?? "Follow"} Ryan Meetup on ${outlet.text}`}
            className="group flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-2 py-3 text-black shadow-sm transition hover:-translate-y-0.5 hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/30 xl:py-4"
          >
            {renderIcon(
              outlet.icon,
              "h-6 w-6 fill-current transition group-hover:scale-105",
            )}
            <span className="max-w-full truncate text-[10px] font-semibold uppercase tracking-[0.12em]">
              {outlet.text}
            </span>
          </NextLink>
        ))}
      </div>

      <Divider margins="lg" />

      <Button.Link
        href="/newsletter"
        leftIcon={<News />}
        variant="primary"
        className="w-full"
      >
        <span className="sm:hidden">Join newsletter</span>
        <span className="hidden sm:inline">Sign up for our newsletter</span>
      </Button.Link>
    </div>
  );
};

export { FollowUs };
