// Components
import NextLink from "next/link";
import { Heading, Divider } from "@/components/global";

// Utilities
import { layoutPaddingX, socials } from "@/lib/constants";

const NewFooter = () => {
  return (
    <footer className={`relative border-t border-black/10 bg-white py-10 dark:border-white/10 dark:bg-black/80 ${layoutPaddingX}`}>
      <div className="grid gap-10 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4 text-center">
          <NextLink href="/" className="flex-col items-center gap-1">
            <Heading
              className="title text-4xl sm:text-5xl md:text-6xl"
              size="h1"
            >
              RYAN MEETUP
            </Heading>
            <Heading
              className="mt-[2px] uppercase font-cooper text-xl title text-center sm:text-2xl md:text-3xl"
              size="h2"
            >
              NO BRYANS ALLOWED
            </Heading>
          </NextLink>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70">
              Follow us
            </h2>
            <ul className="text-sm font-medium text-black/70 dark:text-white/70 space-y-2">
              {socials.map((social) => (
                <li key={social.text}>
                  <NextLink href={social.href} className="hover:underline">
                    {social.text}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70">
              Built with
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm font-medium text-black/70 dark:text-white/70">
              <ul className="space-y-2">
                <li>
                  <NextLink href="https://vercel.com" className="hover:underline">
                    Vercel
                  </NextLink>
                </li>
                <li>
                  <NextLink href="https://nextjs.org/" className="hover:underline">
                    Next.js 14
                  </NextLink>
                </li>
                <li>
                  <NextLink href="https://react.dev/" className="hover:underline">
                    React.js
                  </NextLink>
                </li>
                <li>
                  <NextLink href="https://tailwindcss.com/" className="hover:underline">
                    Tailwind CSS
                  </NextLink>
                </li>
              </ul>
              <ul className="space-y-2">
                <li>
                  <NextLink href="https://headlessui.com/" className="hover:underline">
                    Headless UI
                  </NextLink>
                </li>
                <li>
                  <NextLink href="https://www.contentful.com/" className="hover:underline">
                    Contentful
                  </NextLink>
                </li>
                <li>
                  <NextLink href="https://www.mapbox.com/" className="hover:underline">
                    Mapbox
                  </NextLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Divider margins="lg" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-black/70 dark:text-white/70 sm:text-center">
          Website designed and developed by{" "}
          <NextLink
            href="https://ryanle.dev/"
            className="font-semibold underline"
          >
            Ryan Le
          </NextLink>
          . All Rights Reserved.
        </span>

        <div className="flex space-x-6">
          {socials.map((channel, index) => (
            <NextLink key={index} href={channel.href} aria-label={channel.text}>
              {channel.icon}
            </NextLink>
          ))}
        </div>
      </div>
    </footer>
  );
};

export { NewFooter };
