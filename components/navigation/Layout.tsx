"use client";

import { useState, useEffect } from "react";

// Components
import { Banner, Header, NewFooter } from "@/components/navigation";
import { FloatingCta } from "@/components/global";
import { IoBaseball as Baseball } from "react-icons/io5";
import { useTheme } from "next-themes";
import { layoutPaddingX } from "@/lib/constants";

// Types
import type { ReactNode } from "react";

type LayoutProps = {
  className?: string;
  children: ReactNode;
  fullscreen?: boolean;
};

const Layout = (props: LayoutProps) => {
  const { className, children, fullscreen = false } = props;

  const { theme } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main>
      <Banner />
      <Header />
      <section
        className={`${className} 
                    text-white h-full flex flex-col dark:bg-black dark:text-white
                    ${isClient && theme === "light" ? "bg-[url('/crumbled.png')] bg-repeat bg-cover bg-white" : "bg-white from-white bg-gradient-to-b from-neutral-00 to-neutral-200 to-neutral-00 dark:from-neutral-900 dark:to-black"} 
                    ${fullscreen ? "bg-black" : `py-8 ${layoutPaddingX}`}`}
      >
        {children}
      </section>

      <FloatingCta
        id="rsvp"
        href="/rsvp"
        label="RSVP"
        sublabel="Ryan Baseball Classic"
        secondarySublabel="7/25/26 &nbsp;•&nbsp; Minneapolis, MN"
        ariaLabel="RSVP to upcoming events"
        hiddenRoutes={["/rsvp", "/awards", "/name-change"]}
        icon={<Baseball className="fill-[#d31145] w-8 h-8" />}
      />

      <NewFooter />
    </main>
  );
};

export { Layout };
